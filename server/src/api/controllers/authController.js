import crypto from 'crypto';
import { query, withTransaction } from '../../db/connection.js';
import { hashPassword, verifyPassword } from '../../utils/hash.js';
import { generateAccessToken, generateRefreshToken, getRefreshTokenExpiry } from '../../utils/jwt.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendPasswordResetConfirmEmail, sendPasswordChangedEmail, sendEmailVerifiedConfirmEmail, sendAdminNewUserAlert, sendLoginAlertEmail } from '../../utils/email.js';

// Valid professional designations per Michigan LARA / EPA 40 CFR Part 745
const VALID_DESIGNATIONS = [
  'lead_inspector',
  'lead_risk_assessor',
  'ebl_investigator',
  'clearance_technician',
  'abatement_supervisor',
  'abatement_worker',
  'project_designer',
];

export async function register(req, res) {
  const { email, password, fullName, companyName, role, designation } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required', code: 'VALIDATION_ERROR' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters', code: 'VALIDATION_ERROR' });
  }

  // Validate role
  const userRole = (role === 'client') ? 'client' : 'inspector';

  // Validate designation if provided (only for inspectors)
  let userDesignation = null;
  if (designation && userRole === 'inspector') {
    if (!VALID_DESIGNATIONS.includes(designation)) {
      return res.status(400).json({ error: 'Invalid designation', code: 'VALIDATION_ERROR' });
    }
    userDesignation = designation;
  }

  // Check if email already exists
  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'An account with this email already exists', code: 'EMAIL_EXISTS' });
  }

  // Check if this is the first inspector account — they become Primary Admin + create an org
  let isPrimaryAdmin = false;
  if (userRole === 'inspector') {
    const inspectorCount = await query(
      "SELECT COUNT(*) FROM users WHERE role = 'inspector'"
    );
    if (parseInt(inspectorCount.rows[0].count) === 0) {
      isPrimaryAdmin = true;
    }
  }

  const passwordHash = await hashPassword(password);

  const result = await withTransaction(async (client) => {
    let orgId = null;

    if (isPrimaryAdmin && companyName) {
      // First inspector registering — create the organization
      const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 80);
      const orgResult = await client.query(
        `INSERT INTO organizations (name, slug, email)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [companyName, slug + '-' + Date.now().toString(36), email.toLowerCase()]
      );
      orgId = orgResult.rows[0].id;
    }

    // Create the user
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, company_name, role, designation, is_primary_admin, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, full_name, role, designation, is_primary_admin, organization_id, created_at`,
      [email.toLowerCase(), passwordHash, fullName || null, companyName || null,
       userRole, userDesignation, isPrimaryAdmin, orgId]
    );

    const user = userResult.rows[0];

    // Update org's created_by now that we have the user ID
    if (orgId) {
      await client.query('UPDATE organizations SET created_by = $1 WHERE id = $2', [user.id, orgId]);
    }

    return user;
  });

  const token = generateAccessToken(result.id, result.email);
  const refreshToken = generateRefreshToken();

  await query(
    'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
    [result.id, refreshToken, getRefreshTokenExpiry()]
  );

  // Generate email verification token
  const verifyToken = crypto.randomBytes(32).toString('hex');
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await query(
    'UPDATE users SET email_verification_token = $1, email_verification_expires = $2 WHERE id = $3',
    [verifyToken, verifyExpires, result.id]
  );

  // Send verification + welcome emails (fire and forget — don't block registration)
  sendVerificationEmail(result.email, verifyToken).catch(err => console.error('Verification email failed:', err.message));
  sendWelcomeEmail(result.email, fullName, userRole).catch(err => console.error('Welcome email failed:', err.message));
  sendAdminNewUserAlert(
    process.env.ADMIN_EMAIL || 'admin@abatecomply.com',
    result.email, fullName || result.email, userRole || 'inspector'
  ).catch(err => console.error('Admin alert email failed:', err.message));

  // Get org name for response
  let orgName = companyName || null;
  if (result.organization_id) {
    const orgResult = await query('SELECT name FROM organizations WHERE id = $1', [result.organization_id]);
    if (orgResult.rows.length > 0) orgName = orgResult.rows[0].name;
  }

  res.status(201).json({
    user: {
      id: result.id,
      email: result.email,
      fullName: result.full_name,
      companyName: orgName,
      role: result.role,
      designation: result.designation,
      isPrimaryAdmin: result.is_primary_admin,
      organizationId: result.organization_id,
    },
    token,
    refreshToken,
  });
}

export async function login(req, res) {
  const { email, password, surface } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required', code: 'VALIDATION_ERROR' });
  }

  // `surface` is a client-side hint indicating which login page the
  // credentials came from: "admin" (PlatformAdminLoginPage at /admin),
  // "inspector" (LoginPage at /login), or "client" (LoginPage at /portal).
  // The server enforces surface/role separation so that an inspector
  // cannot inadvertently sign into /admin, and a platform admin isn't
  // silently granted an inspector session from /login. Missing or
  // unknown values are treated as "inspector" for backwards compat.
  const validSurfaces = ['admin', 'inspector', 'client'];
  const loginSurface = validSurfaces.includes(surface) ? surface : 'inspector';

  const result = await query(
    `SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.designation,
            u.is_primary_admin, u.is_platform_admin, u.must_change_password, u.organization_id,
            u.suspended_at, o.name AS org_name
     FROM users u
     LEFT JOIN organizations o ON o.id = u.organization_id
     WHERE u.email = $1 AND u.active = true`,
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
  }

  const user = result.rows[0];

  // Check if user is suspended
  if (user.suspended_at) {
    return res.status(403).json({ error: 'Your account has been suspended. Contact support for assistance.', code: 'ACCOUNT_SUSPENDED' });
  }

  const valid = await verifyPassword(password, user.password_hash);

  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
  }

  // ─── Surface / role enforcement ──────────────────────────────
  // Admin console must reject non-platform-admins. This is the fix for
  // "we're on the admin platform UI but signing in inspection work UI":
  // previously the backend happily issued a session to anyone with valid
  // credentials, and the frontend would then render inspector UI for a
  // non-admin user who happened to be at /admin.
  const isPlatformAdmin = !!user.is_platform_admin;
  if (loginSurface === 'admin' && !isPlatformAdmin) {
    return res.status(403).json({
      error: 'This account is not authorized for the platform admin console. Use the inspector or client login instead.',
      code: 'WRONG_SURFACE_NOT_ADMIN',
    });
  }
  // Symmetric guard: a platform admin signing in through the inspector
  // or client surface would silently get bumped to PlatformAdminDashboard
  // by the frontend — which is confusing because the URL stays at /login.
  // Reject here so the admin knows to go to /admin.
  if ((loginSurface === 'inspector' || loginSurface === 'client') && isPlatformAdmin) {
    return res.status(403).json({
      error: 'Platform admin accounts must sign in at the admin console (/admin).',
      code: 'WRONG_SURFACE_ADMIN_ELSEWHERE',
    });
  }
  // Surface/role match for inspector↔client:
  // If a client account tries to sign in at /login (inspector surface),
  // reject and guide them to /portal. Same in reverse.
  if (loginSurface === 'inspector' && user.role === 'client') {
    return res.status(403).json({
      error: 'This is a client account. Please use the Client Portal to sign in.',
      code: 'WRONG_SURFACE_CLIENT_AT_INSPECTOR',
    });
  }
  if (loginSurface === 'client' && user.role !== 'client') {
    return res.status(403).json({
      error: 'This is an inspector account. Please use the Inspector login to sign in.',
      code: 'WRONG_SURFACE_INSPECTOR_AT_CLIENT',
    });
  }

  const token = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken();

  await Promise.all([
    query('INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, getRefreshTokenExpiry()]),
    query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]),
  ]);

  // Fire-and-forget login alert email
  sendLoginAlertEmail(
    user.email, user.full_name,
    req.ip || req.headers['x-forwarded-for'] || 'Unknown',
    req.headers['user-agent'] || 'Unknown',
    new Date().toISOString()
  ).catch(err => console.error('Login alert email failed:', err.message));

  res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      companyName: user.org_name || null,
      role: user.is_platform_admin ? 'platform_admin' : (user.role || 'inspector'),
      designation: user.designation,
      isPrimaryAdmin: user.is_primary_admin || false,
      isPlatformAdmin: user.is_platform_admin || false,
      mustChangePassword: user.must_change_password || false,
      organizationId: user.organization_id,
    },
    token,
    refreshToken,
  });
}

export async function refresh(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required', code: 'VALIDATION_ERROR' });
  }

  const result = await query(
    `SELECT s.id, s.user_id, u.email FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.refresh_token = $1 AND s.is_revoked = false AND s.expires_at > NOW()`,
    [refreshToken]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid or expired refresh token', code: 'INVALID_REFRESH' });
  }

  const session = result.rows[0];

  // Revoke old token (rotation)
  await query('UPDATE sessions SET is_revoked = true WHERE id = $1', [session.id]);

  // Issue new tokens
  const newToken = generateAccessToken(session.user_id, session.email);
  const newRefreshToken = generateRefreshToken();

  await query(
    'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
    [session.user_id, newRefreshToken, getRefreshTokenExpiry()]
  );

  res.json({ token: newToken, refreshToken: newRefreshToken });
}

export async function logout(req, res) {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await query('UPDATE sessions SET is_revoked = true WHERE refresh_token = $1', [refreshToken]);
  }

  res.json({ success: true });
}

export async function getProfile(req, res) {
  const result = await query(
    `SELECT u.id, u.email, u.full_name, u.phone, u.license_number,
            u.license_verified, u.license_verification_status,
            u.role, u.designation, u.is_primary_admin, u.is_platform_admin,
            u.current_team_id, u.must_change_password, u.organization_id, u.created_at,
            o.name AS org_name, o.id AS org_id
     FROM users u
     LEFT JOIN organizations o ON o.id = u.organization_id
     WHERE u.id = $1`,
    [req.user.userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
  }

  const u = result.rows[0];

  // Get current team info if set
  let currentTeam = null;
  if (u.current_team_id) {
    const teamResult = await query(
      `SELECT t.id, t.name, t.slug, t.subscription_tier, tm.role, tm.designation AS team_designation
       FROM teams t
       JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = $1
       WHERE t.id = $2 AND t.active = true`,
      [u.id, u.current_team_id]
    );
    if (teamResult.rows.length > 0) {
      const t = teamResult.rows[0];
      currentTeam = {
        id: t.id, name: t.name, slug: t.slug, tier: t.subscription_tier,
        role: t.role, designation: t.team_designation,
      };
    }
  }

  // Get count of teams user belongs to (only active teams)
  const teamCount = await query(
    `SELECT COUNT(*) FROM team_members tm
     JOIN teams t ON t.id = tm.team_id AND t.active = true
     WHERE tm.user_id = $1`,
    [u.id]
  );

  // Clean up stale current_team_id if team was deleted
  if (u.current_team_id && !currentTeam) {
    await query('UPDATE users SET current_team_id = NULL WHERE id = $1', [u.id]);
  }

  res.json({
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    companyName: u.org_name || null,
    phone: u.phone,
    licenseNumber: u.license_number,
    licenseVerified: u.license_verified || false,
    licenseVerificationStatus: u.license_verification_status || 'unverified',
    role: u.is_platform_admin ? 'platform_admin' : (u.role || 'inspector'),
    designation: u.designation,
    isPrimaryAdmin: u.is_primary_admin || false,
    isPlatformAdmin: u.is_platform_admin || false,
    mustChangePassword: u.must_change_password || false,
    organizationId: u.org_id || null,
    orgName: u.org_name || null,
    currentTeam,
    teamCount: parseInt(teamCount.rows[0].count),
    createdAt: u.created_at,
  });
}

// PUT /api/auth/designation — update own designation
export async function updateDesignation(req, res) {
  const { designation } = req.body;

  if (!designation || !VALID_DESIGNATIONS.includes(designation)) {
    return res.status(400).json({
      error: 'Invalid designation. Valid options: ' + VALID_DESIGNATIONS.join(', '),
      code: 'VALIDATION_ERROR',
    });
  }

  await query(
    'UPDATE users SET designation = $1, updated_at = NOW() WHERE id = $2',
    [designation, req.user.userId]
  );

  res.json({ success: true, designation });
}

// PUT /api/auth/change-password — user changes own password
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new passwords are required', code: 'VALIDATION_ERROR' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters', code: 'VALIDATION_ERROR' });
  }

  const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.userId]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
  }

  const valid = await verifyPassword(currentPassword, result.rows[0].password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect', code: 'INVALID_PASSWORD' });
  }

  const newHash = await hashPassword(newPassword);
  await query(
    'UPDATE users SET password_hash = $1, must_change_password = false, updated_at = NOW() WHERE id = $2',
    [newHash, req.user.userId]
  );

  sendPasswordChangedEmail(req.user.email, req.user.fullName || req.user.email)
    .catch(err => console.error('Password changed email failed:', err.message));

  res.json({ success: true });
}

// ═══════════════════════════════════════════════════════════
//  FORGOT PASSWORD — request a reset link
// ═══════════════════════════════════════════════════════════

export async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required', code: 'VALIDATION_ERROR' });
  }

  // Always return success to prevent email enumeration
  const user = await query('SELECT id FROM users WHERE email = $1 AND active = true', [email.toLowerCase()]);

  if (user.rows.length > 0) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens for this user
    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [user.rows[0].id]);

    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.rows[0].id, token, expiresAt]
    );

    sendPasswordResetEmail(email.toLowerCase(), token).catch(err =>
      console.error('Password reset email failed:', err.message)
    );
  }

  res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
}

// ═══════════════════════════════════════════════════════════
//  RESET PASSWORD — use the token to set a new password
// ═══════════════════════════════════════════════════════════

export async function resetPassword(req, res) {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required', code: 'VALIDATION_ERROR' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters', code: 'VALIDATION_ERROR' });
  }

  const result = await query(
    'SELECT id, user_id FROM password_reset_tokens WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()',
    [token]
  );

  if (result.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid or expired reset token', code: 'INVALID_TOKEN' });
  }

  const { id: tokenId, user_id: userId } = result.rows[0];
  const hash = await hashPassword(newPassword);

  await query('UPDATE users SET password_hash = $1, must_change_password = false, updated_at = NOW() WHERE id = $2', [hash, userId]);
  await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [tokenId]);

  // Revoke all sessions to force re-login with new password
  await query('UPDATE sessions SET is_revoked = true WHERE user_id = $1', [userId]);

  // Get user email + role for the confirmation email AND so the frontend
  // can route the user back to the correct login surface (admin vs
  // inspector vs client) after a successful reset.
  const userResult = await query(
    'SELECT email, full_name, role, is_platform_admin FROM users WHERE id = $1',
    [userId]
  );
  let surface = 'inspector';
  if (userResult.rows[0]) {
    const u = userResult.rows[0];
    if (u.is_platform_admin) surface = 'admin';
    else if (u.role === 'client') surface = 'client';
    sendPasswordResetConfirmEmail(u.email, u.full_name)
      .catch(err => console.error('Password reset confirm email failed:', err.message));
  }

  res.json({
    success: true,
    surface,
    message: 'Password has been reset. Please log in with your new password.',
  });
}

// ═══════════════════════════════════════════════════════════
//  VERIFY EMAIL — confirm email address
// ═══════════════════════════════════════════════════════════

export async function verifyEmail(req, res) {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required', code: 'VALIDATION_ERROR' });
  }

  const result = await query(
    `SELECT id, email, full_name FROM users
     WHERE email_verification_token = $1
       AND email_verification_expires > NOW()
       AND email_verified = false`,
    [token]
  );

  if (result.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid or expired verification token', code: 'INVALID_TOKEN' });
  }

  await query(
    `UPDATE users SET email_verified = true, email_verification_token = NULL, email_verification_expires = NULL, updated_at = NOW()
     WHERE id = $1`,
    [result.rows[0].id]
  );

  sendEmailVerifiedConfirmEmail(result.rows[0].email, result.rows[0].full_name)
    .catch(err => console.error('Email verified confirm email failed:', err.message));

  res.json({ success: true, message: 'Email verified successfully.' });
}

// ═══════════════════════════════════════════════════════════
//  RESEND VERIFICATION — send another verification email
// ═══════════════════════════════════════════════════════════

export async function resendVerification(req, res) {
  const userId = req.user.userId;

  const user = await query('SELECT id, email, email_verified FROM users WHERE id = $1', [userId]);
  if (user.rows.length === 0) {
    return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
  }
  if (user.rows[0].email_verified) {
    return res.json({ success: true, message: 'Email is already verified.' });
  }

  const verifyToken = crypto.randomBytes(32).toString('hex');
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await query(
    'UPDATE users SET email_verification_token = $1, email_verification_expires = $2 WHERE id = $3',
    [verifyToken, verifyExpires, userId]
  );

  sendVerificationEmail(user.rows[0].email, verifyToken).catch(err =>
    console.error('Resend verification email failed:', err.message)
  );

  res.json({ success: true, message: 'Verification email sent.' });
}

// GET /api/auth/designations — list valid designations (public reference)
export async function listDesignations(_req, res) {
  res.json({
    designations: [
      { key: 'lead_inspector', label: 'Lead Inspector', description: 'Conducts lead-based paint inspections using XRF analysis and paint chip sampling' },
      { key: 'lead_risk_assessor', label: 'Lead Risk Assessor', description: 'Identifies lead hazards in paint, dust, soil, and plumbing; prepares LIRA reports' },
      { key: 'ebl_investigator', label: 'Elevated Blood Lead (EBL) Investigator', description: 'Investigates all lead exposure sources for children with elevated blood lead levels' },
      { key: 'clearance_technician', label: 'Clearance Technician', description: 'Conducts clearance testing following interim controls or abatement activities' },
      { key: 'abatement_supervisor', label: 'Lead Abatement Supervisor', description: 'Supervises and conducts lead abatement projects on-site' },
      { key: 'abatement_worker', label: 'Lead Abatement Worker', description: 'Performs lead abatement work under supervisor direction' },
      { key: 'project_designer', label: 'Lead Project Designer', description: 'Designs lead abatement projects and occupant protection plans' },
    ],
  });
}
