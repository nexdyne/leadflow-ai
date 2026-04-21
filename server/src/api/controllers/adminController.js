import { query, withTransaction } from '../../db/connection.js';
import { hashPassword } from '../../utils/hash.js';
import { generateTempPassword } from '../../utils/tempPassword.js';
import { sendAdminPasswordResetEmail } from '../../utils/email.js';

// Async route wrapper — catches unhandled promise rejections and forwards to Express error handler
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Only Primary Admin can use these endpoints — returns { ok, orgId } or { ok: false }
async function requirePrimaryAdmin(userId) {
  const result = await query(
    'SELECT is_primary_admin, organization_id FROM users WHERE id = $1 AND active = true',
    [userId]
  );
  if (result.rows.length === 0 || !result.rows[0].is_primary_admin) {
    return { ok: false };
  }
  return { ok: true, orgId: result.rows[0].organization_id };
}

// ═══════════════════════════════════════════════════════════
//  USER MANAGEMENT (org-level, independent of teams)
// ═══════════════════════════════════════════════════════════

// GET /api/admin/users — list all users in the admin's organization
export async function listAllUsers(req, res) {
  const auth = await requirePrimaryAdmin(req.user.userId);
  if (!auth.ok) {
    return res.status(403).json({ error: 'Primary Admin access required', code: 'ADMIN_REQUIRED' });
  }

  // Get users scoped to this organization
  const result = await query(
    `SELECT u.id, u.email, u.full_name, u.phone,
            u.role, u.designation, u.license_number, u.license_verified,
            u.license_verification_status, u.is_primary_admin, u.active,
            u.organization_id, u.created_at, u.updated_at
     FROM users u
     WHERE u.organization_id = $1
     ORDER BY u.is_primary_admin DESC, u.full_name NULLS LAST, u.email`,
    [auth.orgId]
  );

  // Get team memberships for org users in one query
  const memberships = await query(
    `SELECT tm.user_id, tm.team_id, tm.role AS team_role, t.name AS team_name,
            t.subscription_tier
     FROM team_members tm
     JOIN teams t ON t.id = tm.team_id AND t.active = true
     JOIN users u ON u.id = tm.user_id
     WHERE u.organization_id = $1
     ORDER BY t.name`,
    [auth.orgId]
  );

  // Group memberships by user_id
  const userTeams = {};
  for (const m of memberships.rows) {
    if (!userTeams[m.user_id]) userTeams[m.user_id] = [];
    userTeams[m.user_id].push({
      teamId: m.team_id,
      teamName: m.team_name,
      teamRole: m.team_role,
      tier: m.subscription_tier,
    });
  }

  res.json({
    users: result.rows.map(r => {
      const teams = userTeams[r.id] || [];
      return {
        id: r.id,
        email: r.email,
        fullName: r.full_name,
        phone: r.phone,
        role: r.role || 'inspector',
        designation: r.designation,
        licenseNumber: r.license_number,
        licenseVerified: r.license_verified || false,
        licenseStatus: r.license_verification_status || 'unverified',
        isPrimaryAdmin: r.is_primary_admin || false,
        active: r.active !== false,
        teamCount: teams.length,
        teamNames: teams.map(t => t.teamName).join(', '),
        teams, // full team membership array with IDs
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    }),
  });
}

// POST /api/admin/users — create a new user in the admin's organization
export async function createUser(req, res) {
  const auth = await requirePrimaryAdmin(req.user.userId);
  if (!auth.ok) {
    return res.status(403).json({ error: 'Primary Admin access required', code: 'ADMIN_REQUIRED' });
  }

  const { email, fullName, phone, role, tempPassword } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required', code: 'VALIDATION_ERROR' });
  }

  // Check if email already exists
  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'An account with this email already exists', code: 'EMAIL_EXISTS' });
  }

  const userRole = (role === 'client') ? 'client' : 'inspector';
  const password = tempPassword || 'ChangeMe123!'; // Temporary password
  const passwordHash = await hashPassword(password);

  const result = await query(
    `INSERT INTO users (email, password_hash, full_name, phone, role, organization_id, must_change_password)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING id, email, full_name, phone, role, organization_id, created_at`,
    [email.toLowerCase(), passwordHash, fullName || null, phone || null, userRole, auth.orgId]
  );

  const u = result.rows[0];
  res.status(201).json({
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    phone: u.phone,
    role: u.role,
    tempPassword: password,
    createdAt: u.created_at,
  });
}

// PUT /api/admin/users/:userId — update user profile (admin edits, scoped to org)
export async function updateUser(req, res) {
  const auth = await requirePrimaryAdmin(req.user.userId);
  if (!auth.ok) {
    return res.status(403).json({ error: 'Primary Admin access required', code: 'ADMIN_REQUIRED' });
  }

  const targetId = parseInt(req.params.userId);
  const { fullName, phone, role } = req.body;

  // Verify user belongs to admin's org
  const targetCheck = await query('SELECT id FROM users WHERE id = $1 AND organization_id = $2', [targetId, auth.orgId]);
  if (targetCheck.rows.length === 0) {
    return res.status(404).json({ error: 'User not found in your organization', code: 'NOT_FOUND' });
  }

  const updates = [];
  const params = [];
  let idx = 1;

  if (fullName !== undefined) { updates.push(`full_name = $${idx++}`); params.push(fullName); }
  if (phone !== undefined) { updates.push(`phone = $${idx++}`); params.push(phone); }
  if (role !== undefined && ['inspector', 'client'].includes(role)) {
    updates.push(`role = $${idx++}`); params.push(role);
  }
  updates.push('updated_at = NOW()');
  params.push(targetId);

  if (updates.length <= 1) {
    return res.status(400).json({ error: 'No fields to update', code: 'VALIDATION_ERROR' });
  }

  await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, params);
  res.json({ success: true });
}

// PUT /api/admin/users/:userId/deactivate
export async function deactivateUser(req, res) {
  const auth = await requirePrimaryAdmin(req.user.userId);
  if (!auth.ok) {
    return res.status(403).json({ error: 'Primary Admin access required', code: 'ADMIN_REQUIRED' });
  }

  const targetId = parseInt(req.params.userId);

  // Can't deactivate yourself
  if (targetId === req.user.userId) {
    return res.status(400).json({ error: 'Cannot deactivate your own account', code: 'SELF_DEACTIVATE' });
  }

  // Scoped to org
  await query('UPDATE users SET active = false, updated_at = NOW() WHERE id = $1 AND organization_id = $2', [targetId, auth.orgId]);
  res.json({ success: true });
}

// PUT /api/admin/users/:userId/reactivate
export async function reactivateUser(req, res) {
  const auth = await requirePrimaryAdmin(req.user.userId);
  if (!auth.ok) {
    return res.status(403).json({ error: 'Primary Admin access required', code: 'ADMIN_REQUIRED' });
  }

  const targetId = parseInt(req.params.userId);
  await query('UPDATE users SET active = true, updated_at = NOW() WHERE id = $1 AND organization_id = $2', [targetId, auth.orgId]);
  res.json({ success: true });
}

// PUT /api/admin/users/:userId/reset-password
// Generates a strong temp password, emails it to the user, and forces change on next login.
// If req.body.newPassword is provided AND >= 8 chars, that password is used instead
// (legacy behavior — admin can still type one directly).
// If req.body.sendEmail === false, the password is NOT emailed (admin will hand it off in person).
export async function resetPassword(req, res) {
  const auth = await requirePrimaryAdmin(req.user.userId);
  if (!auth.ok) {
    return res.status(403).json({ error: 'Primary Admin access required', code: 'ADMIN_REQUIRED' });
  }

  const targetId = parseInt(req.params.userId);

  // Verify user is in admin's org
  const targetCheck = await query(
    'SELECT id, email, full_name FROM users WHERE id = $1 AND organization_id = $2',
    [targetId, auth.orgId]
  );
  if (targetCheck.rows.length === 0) {
    return res.status(404).json({ error: 'User not found in your organization', code: 'NOT_FOUND' });
  }
  const targetUser = targetCheck.rows[0];

  const suppliedPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword.trim() : '';
  const tempPassword = suppliedPassword && suppliedPassword.length >= 8
    ? suppliedPassword
    : generateTempPassword(16);
  const passwordHash = await hashPassword(tempPassword);

  await query(
    'UPDATE users SET password_hash = $1, must_change_password = true, updated_at = NOW() WHERE id = $2',
    [passwordHash, targetId]
  );

  // Revoke all their sessions
  await query(
    'UPDATE sessions SET is_revoked = true WHERE user_id = $1 AND is_revoked = false',
    [targetId]
  );

  // Look up the reset-er's display name for the email
  const resetBy = await query(
    'SELECT COALESCE(full_name, email) AS name FROM users WHERE id = $1',
    [req.user.userId]
  );
  const resetByName = resetBy.rows[0]?.name || 'an administrator';

  // Fire-and-forget email (don't let a Resend outage fail the reset)
  let emailSent = false;
  if (req.body.sendEmail !== false) {
    try {
      const result = await sendAdminPasswordResetEmail(targetUser.email, targetUser.full_name, tempPassword, resetByName);
      emailSent = !result?.skipped;
    } catch (err) {
      console.error('[resetPassword] email send failed:', err.message);
    }
  }

  res.json({
    success: true,
    tempPassword,
    emailSent,
    generated: !suppliedPassword || suppliedPassword.length < 8,
  });
}

// POST /api/admin/users/:userId/add-to-team
export async function addUserToTeam(req, res) {
  const auth = await requirePrimaryAdmin(req.user.userId);
  if (!auth.ok) {
    return res.status(403).json({ error: 'Primary Admin access required', code: 'ADMIN_REQUIRED' });
  }

  const targetId = parseInt(req.params.userId);
  const { teamId, role } = req.body;

  if (!teamId) {
    return res.status(400).json({ error: 'teamId is required', code: 'VALIDATION_ERROR' });
  }

  // Verify user exists, is active, AND belongs to same org
  const userCheck = await query('SELECT id, active, role FROM users WHERE id = $1 AND organization_id = $2', [targetId, auth.orgId]);
  if (userCheck.rows.length === 0) {
    return res.status(404).json({ error: 'User not found in your organization', code: 'NOT_FOUND' });
  }
  if (!userCheck.rows[0].active) {
    return res.status(400).json({ error: 'Cannot add an inactive user to a team. Reactivate them first.', code: 'USER_INACTIVE' });
  }

  const memberRole = ['admin', 'inspector', 'viewer'].includes(role) ? role : 'inspector';

  // Check team exists AND belongs to the same organization
  const teamCheck = await query('SELECT id, max_members FROM teams WHERE id = $1 AND active = true AND organization_id = $2', [teamId, auth.orgId]);
  if (teamCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Team not found in your organization', code: 'NOT_FOUND' });
  }

  // Check not already a member
  const existing = await query(
    'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
    [teamId, targetId]
  );
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'User is already a member of this team', code: 'ALREADY_MEMBER' });
  }

  // Check member limit
  const memberCount = await query('SELECT COUNT(*) FROM team_members WHERE team_id = $1', [teamId]);
  if (parseInt(memberCount.rows[0].count) >= teamCheck.rows[0].max_members) {
    return res.status(403).json({
      error: 'Team member limit reached. Upgrade the team plan first.',
      code: 'MEMBER_LIMIT',
    });
  }

  await query(
    'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
    [teamId, targetId, memberRole]
  );

  // If user has no current team, set this as their current team
  await query(
    'UPDATE users SET current_team_id = $1 WHERE id = $2 AND current_team_id IS NULL',
    [teamId, targetId]
  );

  res.json({ success: true });
}

// PUT /api/admin/users/:userId/designation — set any user's designation + license (org-scoped)
export async function setUserDesignation(req, res) {
  const auth = await requirePrimaryAdmin(req.user.userId);
  if (!auth.ok) {
    return res.status(403).json({ error: 'Primary Admin access required', code: 'ADMIN_REQUIRED' });
  }

  const targetId = parseInt(req.params.userId);

  // Verify user is in admin's org
  const targetCheck = await query('SELECT id FROM users WHERE id = $1 AND organization_id = $2', [targetId, auth.orgId]);
  if (targetCheck.rows.length === 0) {
    return res.status(404).json({ error: 'User not found in your organization', code: 'NOT_FOUND' });
  }
  const { designation, licenseNumber } = req.body;

  const validDesignations = [
    'lead_inspector', 'lead_risk_assessor', 'ebl_investigator',
    'clearance_technician', 'abatement_supervisor', 'abatement_worker', 'project_designer',
  ];

  if (!designation || !validDesignations.includes(designation)) {
    return res.status(400).json({ error: 'Valid designation is required', code: 'VALIDATION_ERROR' });
  }

  // Update user's designation and license info
  await query(
    `UPDATE users SET designation = $1, license_number = $2,
     license_verification_status = CASE WHEN $2 IS NOT NULL THEN 'pending' ELSE 'unverified' END,
     updated_at = NOW()
     WHERE id = $3`,
    [designation, licenseNumber || null, targetId]
  );

  // Also update in any team_members rows for this user
  await query(
    `UPDATE team_members SET designation = $1, license_number = $2,
     license_verification_status = CASE WHEN $2 IS NOT NULL THEN 'pending' ELSE 'unverified' END
     WHERE user_id = $3`,
    [designation, licenseNumber || null, targetId]
  );

  res.json({ success: true, designation, licenseNumber: licenseNumber || null });
}

// DELETE /api/admin/users/:userId/remove-from-team (org-scoped)
export async function removeUserFromTeam(req, res) {
  const auth = await requirePrimaryAdmin(req.user.userId);
  if (!auth.ok) {
    return res.status(403).json({ error: 'Primary Admin access required', code: 'ADMIN_REQUIRED' });
  }

  const targetId = parseInt(req.params.userId);

  // Verify user is in admin's org
  const targetCheck = await query('SELECT id FROM users WHERE id = $1 AND organization_id = $2', [targetId, auth.orgId]);
  if (targetCheck.rows.length === 0) {
    return res.status(404).json({ error: 'User not found in your organization', code: 'NOT_FOUND' });
  }
  const { teamId } = req.body;

  if (!teamId) {
    return res.status(400).json({ error: 'teamId is required', code: 'VALIDATION_ERROR' });
  }

  // Verify user is actually a member of this team
  const memberCheck = await query(
    'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
    [teamId, targetId]
  );
  if (memberCheck.rows.length === 0) {
    return res.status(404).json({ error: 'User is not a member of this team', code: 'NOT_MEMBER' });
  }

  // Remove from team (user stays in the system with their account intact)
  await query('DELETE FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, targetId]);

  // Clear current_team_id if it was this team
  await query(
    'UPDATE users SET current_team_id = NULL WHERE id = $1 AND current_team_id = $2',
    [targetId, teamId]
  );

  // User's designation on the users table stays intact — only team_members row is removed
  res.json({ success: true });
}
