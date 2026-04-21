// clientInviteController.js
// Public (no-auth) endpoints that back the /invite/client/:token flow.
//
// Flow:
//   GET  /api/client-invite/:token           — returns invite preview
//                                             so the UI can show "John
//                                             invited you to 123 Main
//                                             St" before the user
//                                             commits to creating an
//                                             account.
//   POST /api/client-invite/:token/accept    — takes { password, fullName,
//                                             companyName }, creates (or
//                                             re-activates) the client
//                                             user, grants client_projects
//                                             access, marks the invite
//                                             accepted, returns
//                                             { token, refreshToken, user }
//                                             so the UI can drop the
//                                             user straight into the
//                                             Client Portal.
//
// Security posture:
//   - Token lookups are constant-time-ish (we just compare bytes; the
//     token is 64 hex chars of csprng output so timing leaks aren't
//     meaningful).
//   - Tokens are single-use — accepting marks accepted_at, future
//     lookups for that token return GONE.
//   - Tokens expire after CLIENT_INVITE_TTL_DAYS (see clientController).
//   - If an existing account (with the same email) happens to be an
//     INSPECTOR, we refuse to reuse it — the only way to accept is to
//     use a different email. This avoids silently promoting or
//     demoting roles. Pre-existing CLIENT accounts are reused (and
//     the password is optionally updated if provided).
//
// Note: we intentionally do NOT auto-create a team/org for invited
// clients — clients don't live inside the inspector's org.

import crypto from 'crypto';
import { query, withTransaction } from '../../db/connection.js';
import { hashPassword } from '../../utils/hash.js';
import { generateAccessToken, generateRefreshToken, getRefreshTokenExpiry } from '../../utils/jwt.js';
import { createNotification } from './notificationController.js';
import { sendWelcomeEmail, sendClientPortalAccessEmail } from '../../utils/email.js';

const APP_URL = process.env.APP_URL || 'https://abatecomply.com';

function tokenLooksValid(token) {
  return typeof token === 'string' && /^[a-f0-9]{32,128}$/i.test(token);
}

// GET /api/client-invite/:token — preview an invite
export async function getInvite(req, res) {
  const { token } = req.params;
  if (!tokenLooksValid(token)) {
    return res.status(400).json({ error: 'Invalid invite link', code: 'INVALID_TOKEN' });
  }

  const result = await query(
    `SELECT ci.id, ci.email, ci.name, ci.project_id, ci.expires_at,
            ci.accepted_at, ci.revoked_at, ci.message,
            p.project_name, p.property_address, p.city, p.state_code,
            u.full_name AS inspector_name,
            o.name AS inspector_company
     FROM client_invites ci
     JOIN projects p ON p.id = ci.project_id
     JOIN users u ON u.id = ci.invited_by
     LEFT JOIN organizations o ON o.id = u.organization_id
     WHERE ci.token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Invite not found', code: 'NOT_FOUND' });
  }

  const row = result.rows[0];
  if (row.revoked_at) {
    return res.status(410).json({ error: 'This invite was cancelled. Please ask your inspector for a new one.', code: 'REVOKED' });
  }
  if (row.accepted_at) {
    return res.status(410).json({
      error: 'This invite has already been accepted. Sign in to the Client Portal to access your project.',
      code: 'ALREADY_ACCEPTED',
      loginUrl: `${APP_URL}/portal`,
    });
  }
  if (new Date(row.expires_at) < new Date()) {
    return res.status(410).json({ error: 'This invite has expired. Please ask your inspector for a new one.', code: 'EXPIRED' });
  }

  // Check whether the email already exists so the UI can skip asking
  // for a password when the client already has an account.
  const existingUser = await query(
    'SELECT id, role FROM users WHERE email = $1',
    [row.email.toLowerCase()]
  );
  const hasExistingClient = existingUser.rows.length > 0 && existingUser.rows[0].role === 'client';
  const hasNonClientConflict = existingUser.rows.length > 0 && existingUser.rows[0].role !== 'client';

  res.json({
    invite: {
      email: row.email,
      name: row.name,
      projectName: row.project_name,
      projectAddress: [row.property_address, row.city, row.state_code].filter(Boolean).join(', '),
      inspectorName: row.inspector_name,
      inspectorCompany: row.inspector_company,
      message: row.message,
      expiresAt: row.expires_at,
      hasExistingClient,
      hasNonClientConflict,
    },
  });
}

// POST /api/client-invite/:token/accept — accept invite, create account,
// grant project access, return session.
export async function acceptInvite(req, res) {
  const { token } = req.params;
  const { password, fullName, companyName } = req.body;

  if (!tokenLooksValid(token)) {
    return res.status(400).json({ error: 'Invalid invite link', code: 'INVALID_TOKEN' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters', code: 'VALIDATION_ERROR' });
  }

  // Look up invite + claim the row atomically. We re-check expiry and
  // status inside the transaction so two concurrent accepts can't both
  // succeed.
  const result = await withTransaction(async (client) => {
    const inviteResult = await client.query(
      `SELECT id, email, name, project_id, expires_at, accepted_at, revoked_at, invited_by
       FROM client_invites
       WHERE token = $1
       FOR UPDATE`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      return { error: { status: 404, code: 'NOT_FOUND', message: 'Invite not found' } };
    }
    const invite = inviteResult.rows[0];
    if (invite.revoked_at) {
      return { error: { status: 410, code: 'REVOKED', message: 'This invite was cancelled.' } };
    }
    if (invite.accepted_at) {
      return { error: { status: 410, code: 'ALREADY_ACCEPTED', message: 'This invite has already been accepted.' } };
    }
    if (new Date(invite.expires_at) < new Date()) {
      return { error: { status: 410, code: 'EXPIRED', message: 'This invite has expired.' } };
    }

    const normalizedEmail = invite.email.toLowerCase();

    // Either create a new client user or re-use an existing one (if
    // they happen to be a client already). If they exist but are not
    // a client, reject — don't silently change roles.
    const existing = await client.query(
      'SELECT id, role, active FROM users WHERE email = $1',
      [normalizedEmail]
    );

    let userId;
    let userRow;
    let isNewUser = false;

    if (existing.rows.length > 0) {
      if (existing.rows[0].role !== 'client') {
        return { error: {
          status: 409,
          code: 'EMAIL_TAKEN',
          message: 'That email is already in use by a staff account. Contact your inspector for help.',
        } };
      }
      userId = existing.rows[0].id;
      // Refresh password (they may have forgotten, and this is a
      // signed email-only flow so updating is safe).
      const passwordHash = await hashPassword(password);
      const updateResult = await client.query(
        `UPDATE users
         SET password_hash = $1,
             full_name = COALESCE(NULLIF($2, ''), full_name),
             company_name = COALESCE(NULLIF($3, ''), company_name),
             active = true,
             must_change_password = false,
             updated_at = NOW()
         WHERE id = $4
         RETURNING id, email, full_name, company_name, role, organization_id`,
        [passwordHash, fullName || '', companyName || '', userId]
      );
      userRow = updateResult.rows[0];
    } else {
      const passwordHash = await hashPassword(password);
      const insertResult = await client.query(
        `INSERT INTO users (email, password_hash, full_name, company_name, role, active)
         VALUES ($1, $2, $3, $4, 'client', true)
         RETURNING id, email, full_name, company_name, role, organization_id`,
        [normalizedEmail, passwordHash, fullName || invite.name || null, companyName || null]
      );
      userRow = insertResult.rows[0];
      userId = userRow.id;
      isNewUser = true;
    }

    // Grant access to the project that was shared.
    await client.query(
      `INSERT INTO client_projects (client_id, project_id, granted_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (client_id, project_id) DO UPDATE
         SET updated_at = NOW(), granted_by = EXCLUDED.granted_by`,
      [userId, invite.project_id, invite.invited_by]
    );

    // Mark invite accepted.
    await client.query(
      `UPDATE client_invites
       SET accepted_at = NOW(), accepted_user_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [userId, invite.id]
    );

    // Issue session
    const accessToken = generateAccessToken(userId, userRow.email);
    const refreshToken = generateRefreshToken();
    await client.query(
      'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
      [userId, refreshToken, getRefreshTokenExpiry()]
    );

    return {
      ok: {
        user: userRow,
        accessToken,
        refreshToken,
        isNewUser,
        projectId: invite.project_id,
        invitedBy: invite.invited_by,
      },
    };
  });

  if (result.error) {
    return res.status(result.error.status).json({
      error: result.error.message,
      code: result.error.code,
    });
  }

  const { user, accessToken, refreshToken, isNewUser, projectId, invitedBy } = result.ok;

  // Notify the inviting inspector that the client accepted.
  await createNotification(
    invitedBy,
    'invite_accepted',
    'Client Accepted Invite',
    `${user.full_name || user.email} accepted your invite and now has access to the project.`,
    projectId,
    'project'
  ).catch(err => console.error('Invite-accepted notification failed:', err.message));

  // Fire-and-forget welcome emails on first-accept so the client has
  // confirmation of their new account + a link back to the portal.
  if (isNewUser) {
    sendWelcomeEmail(user.email, user.full_name, 'client')
      .catch(err => console.error('Welcome email failed:', err.message));
  }
  sendClientPortalAccessEmail(user.email, user.full_name || 'Client', 'Your inspection project', `${APP_URL}/portal`)
    .catch(err => console.error('Portal access email failed:', err.message));

  res.status(200).json({
    token: accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      companyName: user.company_name,
      role: user.role,
      organizationId: user.organization_id,
    },
    projectId,
  });
}
