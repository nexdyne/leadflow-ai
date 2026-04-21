import { query, withTransaction } from '../../db/connection.js';
import { hashPassword } from '../../utils/hash.js';
import { generateTempPassword } from '../../utils/tempPassword.js';
import {
  sendAnnouncementEmail,
  sendAccountSuspendedEmail,
  sendAccountReactivatedEmail,
  sendAdminPasswordResetEmail,
} from '../../utils/email.js';
import { getBillingSummaryForAdmin } from './billingController.js';

// ─── Helper: verify user is platform admin ──────────────
async function requirePlatformAdmin(userId) {
  const r = await query(
    'SELECT id, is_platform_admin FROM users WHERE id = $1 AND active = true',
    [userId]
  );
  if (r.rows.length === 0 || !r.rows[0].is_platform_admin) {
    const err = new Error('Platform admin access required');
    err.status = 403;
    throw err;
  }
  return r.rows[0];
}

// ─── Helper: escape ILIKE wildcards (CS35) ──────────────
function escapeIlike(str) {
  return str.replace(/[%_\\]/g, '\\$&');
}

// ─── Helper: log an audit event ─────────────────────────
async function auditLog(actorId, actorEmail, action, targetType, targetId, details = {}) {
  try {
    await query(
      `INSERT INTO audit_logs (actor_id, actor_email, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actorId, actorEmail, action, targetType, targetId, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}


// ═══════════════════════════════════════════════════════════
//  DASHBOARD & ANALYTICS
// ═══════════════════════════════════════════════════════════

// GET /api/platform/dashboard — overview stats
export async function getDashboard(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const [users, orgs, teams, projects, recentSignups, activeToday] = await Promise.all([
    query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE role = 'inspector') AS inspectors, COUNT(*) FILTER (WHERE role = 'client') AS clients, COUNT(*) FILTER (WHERE active = false) AS inactive, COUNT(*) FILTER (WHERE suspended_at IS NOT NULL) AS suspended FROM users WHERE is_platform_admin = false"),
    query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE subscription_plan = 'free') AS free, COUNT(*) FILTER (WHERE subscription_plan = 'pro') AS pro, COUNT(*) FILTER (WHERE subscription_plan = 'team') AS team_plan, COUNT(*) FILTER (WHERE subscription_plan = 'enterprise') AS enterprise FROM organizations"),
    query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE active = true) AS active FROM teams"),
    query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_deleted = false) AS active, COUNT(*) FILTER (WHERE is_draft = true AND is_deleted = false) AS drafts FROM projects"),
    query("SELECT COUNT(*) AS count FROM users WHERE created_at > NOW() - INTERVAL '7 days' AND is_platform_admin = false"),
    query("SELECT COUNT(*) AS count FROM users WHERE last_login_at > NOW() - INTERVAL '24 hours'"),
  ]);

  res.json({
    users: {
      total: parseInt(users.rows[0].total),
      inspectors: parseInt(users.rows[0].inspectors),
      clients: parseInt(users.rows[0].clients),
      inactive: parseInt(users.rows[0].inactive),
      suspended: parseInt(users.rows[0].suspended),
    },
    organizations: {
      total: parseInt(orgs.rows[0].total),
      free: parseInt(orgs.rows[0].free),
      pro: parseInt(orgs.rows[0].pro),
      team: parseInt(orgs.rows[0].team_plan),
      enterprise: parseInt(orgs.rows[0].enterprise),
    },
    teams: {
      total: parseInt(teams.rows[0].total),
      active: parseInt(teams.rows[0].active),
    },
    projects: {
      total: parseInt(projects.rows[0].total),
      active: parseInt(projects.rows[0].active),
      drafts: parseInt(projects.rows[0].drafts),
    },
    recentSignups: parseInt(recentSignups.rows[0].count),
    activeToday: parseInt(activeToday.rows[0].count),
  });
}

// GET /api/platform/analytics — signup trends, usage over time
export async function getAnalytics(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const { period = '30' } = req.query;
  const days = Math.min(parseInt(period) || 30, 365);

  const [signupTrend, projectTrend, roleDist] = await Promise.all([
    query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM users WHERE created_at > NOW() - ($1 || ' days')::INTERVAL AND is_platform_admin = false
       GROUP BY DATE(created_at) ORDER BY date`,
      [days.toString()]
    ),
    query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM projects WHERE created_at > NOW() - ($1 || ' days')::INTERVAL
       GROUP BY DATE(created_at) ORDER BY date`,
      [days.toString()]
    ),
    query(
      `SELECT role, COUNT(*) AS count FROM users WHERE is_platform_admin = false GROUP BY role`
    ),
  ]);

  res.json({
    period: days,
    signupTrend: signupTrend.rows,
    projectTrend: projectTrend.rows,
    roleDistribution: roleDist.rows,
  });
}


// ═══════════════════════════════════════════════════════════
//  USER MANAGEMENT
// ═══════════════════════════════════════════════════════════

// GET /api/platform/users — list all users with search/filter/pagination
export async function listUsers(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const { search, role, status, sort = 'created_at', order = 'desc', page = 1, limit = 50 } = req.query;
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  const params = [];
  const conditions = ["u.is_platform_admin = false"];

  if (search) {
    params.push(`%${escapeIlike(search)}%`);
    conditions.push(`(u.email ILIKE $${params.length} OR u.full_name ILIKE $${params.length} OR u.company_name ILIKE $${params.length})`);
  }
  if (role && ['inspector', 'client'].includes(role)) {
    params.push(role);
    conditions.push(`u.role = $${params.length}`);
  }
  if (status === 'active') conditions.push('u.active = true AND u.suspended_at IS NULL');
  if (status === 'suspended') conditions.push('u.suspended_at IS NOT NULL');
  if (status === 'inactive') conditions.push('u.active = false');

  const validSorts = ['created_at', 'email', 'full_name', 'last_login_at'];
  const sortCol = validSorts.includes(sort) ? sort : 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  const where = conditions.join(' AND ');

  const [countResult, usersResult] = await Promise.all([
    query(`SELECT COUNT(*) FROM users u WHERE ${where}`, params),
    query(
      `SELECT u.id, u.email, u.full_name, u.company_name, u.role, u.designation,
              u.is_primary_admin, u.active, u.suspended_at, u.suspended_reason,
              u.last_login_at, u.created_at, u.organization_id,
              o.name AS org_name, o.subscription_plan,
              (SELECT COUNT(*) FROM team_members tm WHERE tm.user_id = u.id) AS team_count,
              (SELECT COUNT(*) FROM projects p WHERE p.user_id = u.id AND p.is_deleted = false) AS project_count
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id
       WHERE ${where}
       ORDER BY u.${sortCol} ${sortOrder}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    ),
  ]);

  res.json({
    users: usersResult.rows.map(u => ({
      id: u.id, email: u.email, fullName: u.full_name, companyName: u.company_name,
      role: u.role, designation: u.designation, isPrimaryAdmin: u.is_primary_admin,
      active: u.active, suspendedAt: u.suspended_at, suspendedReason: u.suspended_reason,
      lastLoginAt: u.last_login_at, createdAt: u.created_at,
      organizationId: u.organization_id, orgName: u.org_name,
      subscriptionPlan: u.subscription_plan,
      teamCount: parseInt(u.team_count), projectCount: parseInt(u.project_count),
    })),
    total: parseInt(countResult.rows[0].count),
    page: parseInt(page),
    limit: parseInt(limit),
  });
}

// GET /api/platform/users/:id — detailed user view
export async function getUser(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const { id } = req.params;
  const result = await query(
    `SELECT u.*, o.name AS org_name, o.subscription_plan
     FROM users u
     LEFT JOIN organizations o ON o.id = u.organization_id
     WHERE u.id = $1`,
    [id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

  const u = result.rows[0];

  // Get teams
  const teams = await query(
    `SELECT t.id, t.name, tm.role, t.subscription_tier
     FROM team_members tm JOIN teams t ON t.id = tm.team_id
     WHERE tm.user_id = $1 AND t.active = true`,
    [id]
  );

  // Get recent projects
  const projects = await query(
    `SELECT id, project_name, status, is_draft, updated_at
     FROM projects WHERE user_id = $1 AND is_deleted = false
     ORDER BY updated_at DESC LIMIT 10`,
    [id]
  );

  // Get recent audit logs for this user
  const logs = await query(
    `SELECT action, details, created_at FROM audit_logs
     WHERE target_type = 'user' AND target_id = $1
     ORDER BY created_at DESC LIMIT 20`,
    [id]
  );

  res.json({
    user: {
      id: u.id, email: u.email, fullName: u.full_name, companyName: u.company_name,
      role: u.role, designation: u.designation, isPrimaryAdmin: u.is_primary_admin,
      active: u.active, suspendedAt: u.suspended_at, suspendedReason: u.suspended_reason,
      lastLoginAt: u.last_login_at, createdAt: u.created_at, updatedAt: u.updated_at,
      organizationId: u.organization_id, orgName: u.org_name,
      subscriptionPlan: u.subscription_plan, phone: u.phone,
      licenseNumber: u.license_number, licenseVerified: u.license_verified,
    },
    teams: teams.rows,
    recentProjects: projects.rows,
    auditHistory: logs.rows,
  });
}

// PUT /api/platform/users/:id/suspend — suspend a user
export async function suspendUser(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const { id } = req.params;
  const { reason } = req.body;

  await query(
    `UPDATE users SET suspended_at = NOW(), suspended_reason = $1, active = false, updated_at = NOW()
     WHERE id = $2 AND is_platform_admin = false`,
    [reason || 'Suspended by platform admin', id]
  );

  // Revoke all active sessions
  await query(
    `UPDATE sessions SET is_revoked = true WHERE user_id = $1 AND is_revoked = false`,
    [id]
  );

  // Notify the suspended user
  const userInfo = await query('SELECT email, full_name FROM users WHERE id = $1', [id]);
  if (userInfo.rows[0]) {
    sendAccountSuspendedEmail(
      userInfo.rows[0].email,
      userInfo.rows[0].full_name,
      reason || 'Policy violation'
    ).catch(err => console.error('Account suspended email failed:', err.message));
  }

  await auditLog(req.user.userId, req.user.email, 'user.suspended', 'user', parseInt(id), { reason });

  res.json({ success: true });
}

// PUT /api/platform/users/:id/reactivate — reactivate a suspended user
export async function reactivateUser(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const { id } = req.params;

  await query(
    `UPDATE users SET suspended_at = NULL, suspended_reason = NULL, active = true, updated_at = NOW()
     WHERE id = $1`,
    [id]
  );

  const userInfo = await query('SELECT email, full_name FROM users WHERE id = $1', [id]);
  if (userInfo.rows[0]) {
    sendAccountReactivatedEmail(userInfo.rows[0].email, userInfo.rows[0].full_name)
      .catch(err => console.error('Account reactivated email failed:', err.message));
  }

  await auditLog(req.user.userId, req.user.email, 'user.reactivated', 'user', parseInt(id), {});

  res.json({ success: true });
}

// DELETE /api/platform/users/:id — soft-delete a user (set active = false permanently)
export async function deleteUser(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const { id } = req.params;

  // Don't delete platform admins
  const check = await query('SELECT is_platform_admin FROM users WHERE id = $1', [id]);
  if (check.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  if (check.rows[0].is_platform_admin) return res.status(403).json({ error: 'Cannot delete platform admin' });

  await query(
    `UPDATE users SET active = false, suspended_at = NOW(), suspended_reason = 'Account deleted by platform admin', updated_at = NOW()
     WHERE id = $1`,
    [id]
  );

  // Revoke sessions
  await query('UPDATE sessions SET is_revoked = true WHERE user_id = $1', [id]);

  await auditLog(req.user.userId, req.user.email, 'user.deleted', 'user', parseInt(id), {});

  res.json({ success: true });
}

// PUT /api/platform/users/:id/reset-password — force reset a user's password.
//
// Behaviors:
//   - If req.body.newPassword is supplied (>= 8 chars), use it verbatim.
//   - Otherwise, generate a strong 16-char temp password.
//   - Password is hashed, must_change_password=true, all sessions revoked.
//   - Unless req.body.sendEmail === false, the temp password is emailed
//     to the user via Resend (sendAdminPasswordResetEmail). Emails fall
//     back silently if RESEND_API_KEY isn't configured — admin can still
//     copy the temp password from the response.
//   - The plaintext temp password is returned in the JSON response so the
//     platform admin can hand it off out-of-band if email delivery is off.
export async function resetUserPassword(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const { id } = req.params;
  const targetId = parseInt(id);
  if (!Number.isFinite(targetId)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  const targetRow = await query(
    'SELECT id, email, full_name, is_platform_admin FROM users WHERE id = $1',
    [targetId]
  );
  if (targetRow.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  const target = targetRow.rows[0];

  const supplied = typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : '';
  const tempPassword = supplied && supplied.length >= 8 ? supplied : generateTempPassword(16);
  const hash = await hashPassword(tempPassword);

  await query(
    `UPDATE users SET password_hash = $1, must_change_password = true, updated_at = NOW() WHERE id = $2`,
    [hash, targetId]
  );

  // Revoke all sessions to force re-login
  await query('UPDATE sessions SET is_revoked = true WHERE user_id = $1', [targetId]);

  // Resolve a friendly "reset by" name
  const actorRow = await query(
    'SELECT COALESCE(full_name, email) AS name FROM users WHERE id = $1',
    [req.user.userId]
  );
  const resetByName = actorRow.rows[0]?.name || 'Platform admin';

  let emailSent = false;
  if (req.body?.sendEmail !== false) {
    try {
      const result = await sendAdminPasswordResetEmail(target.email, target.full_name, tempPassword, resetByName, !!target.is_platform_admin);
      emailSent = !result?.skipped;
    } catch (err) {
      console.error('[resetUserPassword] email send failed:', err.message);
    }
  }

  await auditLog(req.user.userId, req.user.email, 'user.password_reset', 'user', targetId, {
    emailSent,
    generated: !(supplied && supplied.length >= 8),
  });

  res.json({
    success: true,
    tempPassword,
    emailSent,
    generated: !(supplied && supplied.length >= 8),
  });
}


// ═══════════════════════════════════════════════════════════
//  ORGANIZATION MANAGEMENT
// ═══════════════════════════════════════════════════════════

// GET /api/platform/organizations — list all orgs
export async function listOrganizations(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const { search, plan, page = 1, limit = 50 } = req.query;
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  const params = [];
  const conditions = [];

  if (search) {
    params.push(`%${escapeIlike(search)}%`);
    conditions.push(`(o.name ILIKE $${params.length} OR o.email ILIKE $${params.length})`);
  }
  if (plan) {
    params.push(plan);
    conditions.push(`o.subscription_plan = $${params.length}`);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const [countResult, orgsResult] = await Promise.all([
    query(`SELECT COUNT(*) FROM organizations o ${where}`, params),
    query(
      `SELECT o.*,
              (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id AND u.active = true) AS user_count,
              (SELECT COUNT(*) FROM teams t WHERE t.organization_id = o.id AND t.active = true) AS team_count,
              (SELECT u.full_name FROM users u WHERE u.id = o.created_by) AS owner_name,
              (SELECT u.email FROM users u WHERE u.id = o.created_by) AS owner_email
       FROM organizations o
       ${where}
       ORDER BY o.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    ),
  ]);

  res.json({
    organizations: orgsResult.rows.map(o => ({
      id: o.id, name: o.name, slug: o.slug,
      address: o.address, city: o.city, stateCode: o.state_code, zip: o.zip,
      phone: o.phone, email: o.email,
      subscriptionPlan: o.subscription_plan, subscriptionStatus: o.subscription_status,
      trialEndsAt: o.trial_ends_at, monthlyRate: o.monthly_rate,
      billingEmail: o.billing_email, notes: o.notes,
      active: o.active, createdAt: o.created_at,
      userCount: parseInt(o.user_count), teamCount: parseInt(o.team_count),
      ownerName: o.owner_name, ownerEmail: o.owner_email,
    })),
    total: parseInt(countResult.rows[0].count),
    page: parseInt(page),
    limit: parseInt(limit),
  });
}

// PUT /api/platform/organizations/:id — update org details (plan, notes, etc.)
export async function updateOrganization(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const { id } = req.params;
  const { subscriptionPlan, subscriptionStatus, monthlyRate, billingEmail, notes, trialEndsAt } = req.body;

  const updates = [];
  const params = [];

  if (subscriptionPlan !== undefined) { params.push(subscriptionPlan); updates.push(`subscription_plan = $${params.length}`); }
  if (subscriptionStatus !== undefined) { params.push(subscriptionStatus); updates.push(`subscription_status = $${params.length}`); }
  if (monthlyRate !== undefined) { params.push(monthlyRate); updates.push(`monthly_rate = $${params.length}`); }
  if (billingEmail !== undefined) { params.push(billingEmail); updates.push(`billing_email = $${params.length}`); }
  if (notes !== undefined) { params.push(notes); updates.push(`notes = $${params.length}`); }
  if (trialEndsAt !== undefined) { params.push(trialEndsAt); updates.push(`trial_ends_at = $${params.length}`); }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  updates.push('updated_at = NOW()');
  params.push(id);

  await query(
    `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${params.length}`,
    params
  );

  await auditLog(req.user.userId, req.user.email, 'org.updated', 'organization', parseInt(id), req.body);

  res.json({ success: true });
}


// ═══════════════════════════════════════════════════════════
//  ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════

// GET /api/platform/announcements — list all announcements
export async function listAnnouncements(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const result = await query(
    `SELECT a.*,
            (SELECT COUNT(*) FROM announcement_dismissals ad WHERE ad.announcement_id = a.id) AS dismiss_count,
            u.full_name AS created_by_name
     FROM announcements a
     LEFT JOIN users u ON u.id = a.created_by
     ORDER BY a.created_at DESC`
  );

  res.json({ announcements: result.rows });
}

// POST /api/platform/announcements — create announcement
export async function createAnnouncement(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const { title, body, type = 'info', targetAudience = 'all', expiresAt, sendEmail: shouldEmail } = req.body;

  if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });

  const result = await query(
    `INSERT INTO announcements (title, body, type, target_audience, created_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [title, body, type, targetAudience, req.user.userId, expiresAt || null]
  );

  await auditLog(req.user.userId, req.user.email, 'announcement.created', 'announcement', result.rows[0].id, { title, type });

  // Broadcast email if requested
  let emailsSent = 0;
  if (shouldEmail) {
    try {
      let audienceCondition = "u.active = true AND u.is_platform_admin = false";
      if (targetAudience === 'inspectors') audienceCondition += " AND u.role = 'inspector'";
      else if (targetAudience === 'clients') audienceCondition += " AND u.role = 'client'";

      const users = await query(`SELECT email FROM users u WHERE ${audienceCondition}`);
      for (const u of users.rows) {
        sendAnnouncementEmail(u.email, title, body, type).catch(err =>
          console.error(`Announcement email to ${u.email} failed:`, err.message)
        );
        emailsSent++;
      }
    } catch (err) {
      console.error('Announcement broadcast failed:', err.message);
    }
  }

  res.status(201).json({ announcement: result.rows[0], emailsSent });
}

// PUT /api/platform/announcements/:id — update announcement
export async function updateAnnouncement(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const { id } = req.params;
  const { title, body, type, targetAudience, isActive, expiresAt } = req.body;

  const updates = [];
  const params = [];

  if (title !== undefined) { params.push(title); updates.push(`title = $${params.length}`); }
  if (body !== undefined) { params.push(body); updates.push(`body = $${params.length}`); }
  if (type !== undefined) { params.push(type); updates.push(`type = $${params.length}`); }
  if (targetAudience !== undefined) { params.push(targetAudience); updates.push(`target_audience = $${params.length}`); }
  if (isActive !== undefined) { params.push(isActive); updates.push(`is_active = $${params.length}`); }
  if (expiresAt !== undefined) { params.push(expiresAt); updates.push(`expires_at = $${params.length}`); }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  updates.push('updated_at = NOW()');
  params.push(id);

  await query(
    `UPDATE announcements SET ${updates.join(', ')} WHERE id = $${params.length}`,
    params
  );

  res.json({ success: true });
}

// DELETE /api/platform/announcements/:id — delete announcement
export async function deleteAnnouncement(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const { id } = req.params;
  await query('DELETE FROM announcements WHERE id = $1', [id]);
  await auditLog(req.user.userId, req.user.email, 'announcement.deleted', 'announcement', parseInt(id), {});
  res.json({ success: true });
}


// ═══════════════════════════════════════════════════════════
//  AUDIT LOGS
// ═══════════════════════════════════════════════════════════

// GET /api/platform/audit-logs — search audit logs
export async function listAuditLogs(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const { action, targetType, page = 1, limit = 50 } = req.query;
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  const params = [];
  const conditions = [];

  if (action) {
    params.push(`%${escapeIlike(action)}%`);
    conditions.push(`al.action ILIKE $${params.length}`);
  }
  if (targetType) {
    params.push(targetType);
    conditions.push(`al.target_type = $${params.length}`);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const result = await query(
    `SELECT al.*, u.full_name AS actor_name
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, parseInt(limit), offset]
  );

  const count = await query(`SELECT COUNT(*) FROM audit_logs al ${where}`, params);

  res.json({
    logs: result.rows,
    total: parseInt(count.rows[0].count),
    page: parseInt(page),
    limit: parseInt(limit),
  });
}


// ═══════════════════════════════════════════════════════════
//  REVENUE / SUBSCRIPTION MANAGEMENT
// ═══════════════════════════════════════════════════════════

// GET /api/platform/revenue — revenue overview
export async function getRevenue(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const [mrr, planBreakdown, recentChanges, billingSummary] = await Promise.all([
    query(
      `SELECT COALESCE(SUM(monthly_rate), 0) AS total_mrr
       FROM organizations WHERE subscription_status = 'active' AND monthly_rate > 0`
    ),
    query(
      `SELECT subscription_plan, COUNT(*) AS count, COALESCE(SUM(monthly_rate), 0) AS revenue
       FROM organizations
       WHERE subscription_status = 'active'
       GROUP BY subscription_plan
       ORDER BY revenue DESC`
    ),
    query(
      `SELECT al.details, al.action, al.created_at, u.full_name AS actor_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_id
       WHERE al.action LIKE 'org.%' OR al.action LIKE 'billing.%'
          OR al.action LIKE 'subscription.%' OR al.action LIKE 'invoice.%'
       ORDER BY al.created_at DESC LIMIT 30`
    ),
    // Stripe-backed billing summary. Returns stripeEnabled=false and empty
    // arrays when Stripe is not configured, so the frontend can render a
    // "Stripe not configured" banner without any conditional logic here.
    getBillingSummaryForAdmin().catch((err) => {
      console.error('getBillingSummary failed:', err.message);
      return { stripeEnabled: false, stripeCustomerCount: 0, activeSubscriptionCount: 0, mrrCents: 0, recentInvoices: [], failedInvoices: [] };
    }),
  ]);

  const adminTypedMrr = parseFloat(mrr.rows[0].total_mrr);
  const stripeMrr = (billingSummary.mrrCents || 0) / 100;

  res.json({
    // Admin-typed MRR (from organizations.monthly_rate) — this is what we've
    // always returned. Stays authoritative for pilot customers without Stripe.
    mrr: adminTypedMrr,
    // Stripe-backed MRR from active subscriptions. Will be 0 until orgs
    // start paying through Stripe. The admin dashboard can show both side
    // by side so the discrepancy is visible.
    stripeMrr: stripeMrr,
    // Combined — best estimate of real monthly recurring revenue. Admin-typed
    // values for non-Stripe orgs + real Stripe values for paying orgs. This is
    // the number to trust once Stripe is live.
    combinedMrr: adminTypedMrr + stripeMrr,
    planBreakdown: planBreakdown.rows,
    recentChanges: recentChanges.rows,
    billing: billingSummary,
  });
}


// ═══════════════════════════════════════════════════════════
//  USER-FACING: get active announcements (non-admin endpoint)
// ═══════════════════════════════════════════════════════════

export async function getActiveAnnouncements(req, res) {
  try {
    const userId = req.user.userId;

    // Get user role for audience targeting
    const userResult = await query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return res.json({ announcements: [] });

    const userRole = userResult.rows[0].role;
    const audienceFilter = userRole === 'client'
      ? "AND (a.target_audience = 'all' OR a.target_audience = 'clients')"
      : "AND (a.target_audience = 'all' OR a.target_audience = 'inspectors')";

    const result = await query(
      `SELECT a.id, a.title, a.body, a.type, a.starts_at, a.expires_at
       FROM announcements a
       WHERE a.is_active = true
         AND a.starts_at <= NOW()
         AND (a.expires_at IS NULL OR a.expires_at > NOW())
         ${audienceFilter}
         AND NOT EXISTS (
           SELECT 1 FROM announcement_dismissals ad
           WHERE ad.announcement_id = a.id AND ad.user_id = $1
         )
       ORDER BY a.created_at DESC
       LIMIT 5`,
      [userId]
    );

    res.json({ announcements: result.rows });
  } catch (err) {
    console.error('getActiveAnnouncements error:', err.message);
    res.json({ announcements: [] }); // Non-critical — return empty rather than 500
  }
}

// POST /api/platform/announcements/:id/dismiss — user dismisses an announcement
export async function dismissAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await query(
      `INSERT INTO announcement_dismissals (announcement_id, user_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [id, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('dismissAnnouncement error:', err.message);
    res.status(500).json({ error: 'Failed to dismiss announcement' });
  }
}


// ═══════════════════════════════════════════════════════════
//  PROJECTS / INSPECTIONS (admin visibility)
// ═══════════════════════════════════════════════════════════

// GET /api/platform/projects — list all projects with filters + pagination
// Filters: search (address/project name), inspector_id, org_id, status (draft|active|deleted),
//          inspection_type, date_from, date_to
// Sort: created_at (default), updated_at, inspection_date
export async function listProjects(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const {
    search, inspector_id, org_id, status, inspection_type,
    date_from, date_to,
    sort = 'created_at', order = 'desc',
    page = 1, limit = 50,
  } = req.query;

  const params = [];
  const conditions = [];

  if (search) {
    params.push(`%${escapeIlike(search)}%`);
    conditions.push(`(p.project_name ILIKE $${params.length} OR p.property_address ILIKE $${params.length} OR p.city ILIKE $${params.length})`);
  }
  if (inspector_id) {
    params.push(parseInt(inspector_id));
    conditions.push(`p.user_id = $${params.length}`);
  }
  if (org_id) {
    params.push(parseInt(org_id));
    conditions.push(`u.organization_id = $${params.length}`);
  }
  if (status === 'draft') conditions.push('p.is_draft = true AND p.is_deleted = false');
  else if (status === 'active') conditions.push('p.is_draft = false AND p.is_deleted = false');
  else if (status === 'deleted') conditions.push('p.is_deleted = true');
  else conditions.push('p.is_deleted = false'); // default: exclude soft-deleted

  if (inspection_type) {
    params.push(inspection_type);
    conditions.push(`p.inspection_type = $${params.length}`);
  }
  if (date_from) {
    params.push(date_from);
    conditions.push(`p.created_at >= $${params.length}`);
  }
  if (date_to) {
    params.push(date_to);
    conditions.push(`p.created_at <= $${params.length}`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const validSorts = ['created_at', 'updated_at', 'inspection_date', 'property_address'];
  const sortCol = validSorts.includes(sort) ? sort : 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  try {
    const [countResult, projectsResult] = await Promise.all([
      query(`SELECT COUNT(*) FROM projects p LEFT JOIN users u ON u.id = p.user_id ${where}`, params),
      query(
        `SELECT p.id, p.project_name, p.property_address, p.city, p.state_code, p.zip,
                p.year_built, p.inspection_date, p.inspection_type, p.program_type,
                p.is_draft, p.is_deleted, p.created_at, p.updated_at,
                p.user_id, u.email AS inspector_email, u.full_name AS inspector_name, u.role AS inspector_role,
                u.organization_id, o.name AS org_name, o.subscription_plan,
                p.team_id, t.name AS team_name,
                (SELECT COUNT(*) FROM photos ph WHERE ph.project_id = p.id) AS photo_count
         FROM projects p
         LEFT JOIN users u ON u.id = p.user_id
         LEFT JOIN organizations o ON o.id = u.organization_id
         LEFT JOIN teams t ON t.id = p.team_id
         ${where}
         ORDER BY p.${sortCol} ${sortOrder} NULLS LAST
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitNum, offset]
      ),
    ]);

    const total = parseInt(countResult.rows[0].count);
    const projects = projectsResult.rows.map((r) => ({
      id: r.id,
      projectName: r.project_name,
      propertyAddress: r.property_address,
      city: r.city,
      stateCode: r.state_code,
      zip: r.zip,
      yearBuilt: r.year_built,
      inspectionDate: r.inspection_date,
      inspectionType: r.inspection_type,
      programType: r.program_type,
      isDraft: r.is_draft,
      isDeleted: r.is_deleted,
      status: r.is_deleted ? 'deleted' : r.is_draft ? 'draft' : 'active',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      inspectorId: r.user_id,
      inspectorEmail: r.inspector_email,
      inspectorName: r.inspector_name,
      inspectorRole: r.inspector_role,
      organizationId: r.organization_id,
      orgName: r.org_name,
      orgPlan: r.subscription_plan,
      teamId: r.team_id,
      teamName: r.team_name,
      photoCount: parseInt(r.photo_count || 0),
    }));

    res.json({
      projects,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    });
  } catch (err) {
    console.error('listProjects error:', err.message);
    res.status(500).json({ error: 'Failed to load projects' });
  }
}

// GET /api/platform/projects/:id — full detail for a single project
export async function getProjectDetail(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const projectId = parseInt(req.params.id);
  if (!projectId) {
    return res.status(400).json({ error: 'Invalid project id' });
  }

  try {
    const [projectResult, photosResult, auditResult] = await Promise.all([
      query(
        `SELECT p.*, u.email AS inspector_email, u.full_name AS inspector_name,
                u.role AS inspector_role, u.organization_id,
                o.name AS org_name, o.subscription_plan,
                t.name AS team_name
         FROM projects p
         LEFT JOIN users u ON u.id = p.user_id
         LEFT JOIN organizations o ON o.id = u.organization_id
         LEFT JOIN teams t ON t.id = p.team_id
         WHERE p.id = $1`,
        [projectId]
      ),
      query(
        `SELECT id, file_id, original_filename, file_size, mime_type, photo_index,
                room, component, side, condition, category, caption, created_at
         FROM photos WHERE project_id = $1 ORDER BY photo_index NULLS LAST, created_at`,
        [projectId]
      ),
      query(
        `SELECT id, actor_email, action, details, created_at
         FROM audit_logs
         WHERE target_type = 'project' AND target_id = $1
         ORDER BY created_at DESC LIMIT 50`,
        [projectId]
      ),
    ]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const p = projectResult.rows[0];
    // state_data can be large JSONB; summarize rather than return the whole blob
    // Platform admin should see what was inspected, not replay the inspector's UI state.
    const state = p.state_data || {};
    const stateSummary = {
      hasSignature: !!(state.signature || (state.signatures && Object.keys(state.signatures).length)),
      hasSamples: Array.isArray(state.samples) ? state.samples.length : 0,
      hasInterview: !!(state.interviewResponses && Object.keys(state.interviewResponses).length),
      checklistComplete: state.checklistCompleteRatio || null,
      reportGeneratedAt: state.lastReportGeneratedAt || null,
      signedOffAt: state.signedOffAt || null,
      qaStatus: state.qaStatus || null,
    };

    res.json({
      project: {
        id: p.id,
        projectName: p.project_name,
        propertyAddress: p.property_address,
        city: p.city,
        stateCode: p.state_code,
        zip: p.zip,
        yearBuilt: p.year_built,
        inspectionDate: p.inspection_date,
        inspectionType: p.inspection_type,
        programType: p.program_type,
        isDraft: p.is_draft,
        isDeleted: p.is_deleted,
        status: p.is_deleted ? 'deleted' : p.is_draft ? 'draft' : 'active',
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        inspectorId: p.user_id,
        inspectorEmail: p.inspector_email,
        inspectorName: p.inspector_name,
        inspectorRole: p.inspector_role,
        organizationId: p.organization_id,
        orgName: p.org_name,
        orgPlan: p.subscription_plan,
        teamId: p.team_id,
        teamName: p.team_name,
      },
      stateSummary,
      photos: photosResult.rows,
      auditHistory: auditResult.rows,
    });
  } catch (err) {
    console.error('getProjectDetail error:', err.message);
    res.status(500).json({ error: 'Failed to load project detail' });
  }
}

