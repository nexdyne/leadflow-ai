import { query, withTransaction } from '../../db/connection.js';
import crypto from 'crypto';
import { sendTeamInviteEmail, sendInviteAcceptedEmail, sendMemberRemovedEmail, sendRoleChangedEmail, sendTeamCreatedEmail, sendTierChangedEmail } from '../../utils/email.js';

// ─── Tier limits ───────────────────────────────────────────
const TIER_LIMITS = {
  free:  { maxMembers: 3,  maxProjects: 5   },
  pro:   { maxMembers: 10, maxProjects: 50  },
  team:  { maxMembers: 50, maxProjects: 200 },
};

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 80);
}

// ─── Create Team ───────────────────────────────────────────
// Only Primary Admin can create teams — team is linked to admin's org
export async function createTeam(req, res) {
  const userId = req.user.userId;
  const { name, description } = req.body;

  // Must be primary admin to create a team
  const userCheck = await query(
    'SELECT is_primary_admin, role, organization_id FROM users WHERE id = $1',
    [userId]
  );
  if (userCheck.rows.length === 0 || !userCheck.rows[0].is_primary_admin) {
    return res.status(403).json({
      error: 'Only the Primary Admin can create teams',
      code: 'ADMIN_REQUIRED',
    });
  }

  const orgId = userCheck.rows[0].organization_id;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Team name must be at least 2 characters', code: 'VALIDATION_ERROR' });
  }

  // Generate unique slug
  let slug = slugify(name);
  const existing = await query('SELECT id FROM teams WHERE slug = $1', [slug]);
  if (existing.rows.length > 0) {
    slug = slug + '-' + Date.now().toString(36);
  }

  const limits = TIER_LIMITS.free;

  const result = await withTransaction(async (client) => {
    // Create team with organization_id
    const teamResult = await client.query(
      `INSERT INTO teams (name, slug, description, created_by, organization_id, max_members, max_projects)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, slug, subscription_tier, max_members, max_projects, created_at`,
      [name.trim(), slug, description || null, userId, orgId, limits.maxMembers, limits.maxProjects]
    );
    const team = teamResult.rows[0];

    // Add creator as admin member
    await client.query(
      'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
      [team.id, userId, 'admin']
    );

    // Set as user's current team
    await client.query('UPDATE users SET current_team_id = $1 WHERE id = $2', [team.id, userId]);

    return team;
  });

  sendTeamCreatedEmail(req.user.email, req.user.fullName, result.name)
    .catch(err => console.error('Team created email failed:', err.message));

  res.status(201).json({
    id: result.id,
    name: result.name,
    slug: result.slug,
    subscriptionTier: result.subscription_tier,
    maxMembers: result.max_members,
    maxProjects: result.max_projects,
    role: 'admin',
    createdAt: result.created_at,
  });
}

// ─── List User's Teams ────────────────────────────────────
export async function listTeams(req, res) {
  const userId = req.user.userId;

  const result = await query(
    `SELECT t.id, t.name, t.slug, t.subscription_tier, t.max_members, t.max_projects,
            tm.role, t.created_at,
            (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count,
            (SELECT COUNT(*) FROM projects WHERE team_id = t.id AND is_deleted = false) AS project_count
     FROM teams t
     JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = $1
     WHERE t.active = true
     ORDER BY t.name`,
    [userId]
  );

  res.json({
    teams: result.rows.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      subscriptionTier: r.subscription_tier,
      maxMembers: r.max_members,
      maxProjects: r.max_projects,
      role: r.role,
      memberCount: parseInt(r.member_count),
      projectCount: parseInt(r.project_count),
      createdAt: r.created_at,
    })),
  });
}

// ─── Get Team Details ─────────────────────────────────────
export async function getTeam(req, res) {
  const userId = req.user.userId;
  const teamId = parseInt(req.params.teamId);

  // Verify membership
  const memberCheck = await query(
    'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
    [teamId, userId]
  );
  if (memberCheck.rows.length === 0) {
    return res.status(403).json({ error: 'Not a member of this team', code: 'FORBIDDEN' });
  }

  const result = await query(
    `SELECT t.*, u.full_name AS creator_name, u.email AS creator_email
     FROM teams t JOIN users u ON u.id = t.created_by
     WHERE t.id = $1 AND t.active = true`,
    [teamId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Team not found', code: 'NOT_FOUND' });
  }

  const t = result.rows[0];
  res.json({
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    subscriptionTier: t.subscription_tier,
    maxMembers: t.max_members,
    maxProjects: t.max_projects,
    createdBy: { name: t.creator_name, email: t.creator_email },
    myRole: memberCheck.rows[0].role,
    createdAt: t.created_at,
  });
}

// ─── Update Team ──────────────────────────────────────────
export async function updateTeam(req, res) {
  const userId = req.user.userId;
  const teamId = parseInt(req.params.teamId);
  const { name, description } = req.body;

  // Must be admin
  const memberCheck = await query(
    'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
    [teamId, userId]
  );
  if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update team settings', code: 'FORBIDDEN' });
  }

  const updates = [];
  const params = [];
  let idx = 1;

  if (name !== undefined) {
    updates.push(`name = $${idx++}`);
    params.push(name.trim());
  }
  if (description !== undefined) {
    updates.push(`description = $${idx++}`);
    params.push(description);
  }
  updates.push('updated_at = NOW()');
  params.push(teamId);

  await query(`UPDATE teams SET ${updates.join(', ')} WHERE id = $${idx}`, params);

  res.json({ success: true });
}

// ─── List Members ─────────────────────────────────────────
export async function listMembers(req, res) {
  const userId = req.user.userId;
  const teamId = parseInt(req.params.teamId);

  // Verify membership
  const memberCheck = await query(
    'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
    [teamId, userId]
  );
  if (memberCheck.rows.length === 0) {
    return res.status(403).json({ error: 'Not a member of this team', code: 'FORBIDDEN' });
  }

  const result = await query(
    `SELECT tm.id, tm.user_id, tm.role, tm.designation AS team_designation, tm.joined_at,
            tm.license_number AS tm_license_number, tm.license_verified AS tm_license_verified,
            tm.license_verification_status AS tm_license_status,
            u.email, u.full_name, u.designation AS user_designation,
            u.license_number AS u_license_number, u.license_verified AS u_license_verified,
            u.license_verification_status AS u_license_status,
            u.is_primary_admin, u.active
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = $1 AND u.active = true
     ORDER BY tm.role = 'admin' DESC, u.full_name`,
    [teamId]
  );

  res.json({
    members: result.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      email: r.email,
      fullName: r.full_name,
      role: r.role,
      designation: r.team_designation || r.user_designation,
      licenseNumber: r.tm_license_number || r.u_license_number,
      licenseVerified: r.tm_license_verified || r.u_license_verified || false,
      licenseStatus: r.tm_license_status || r.u_license_status || 'unverified',
      isPrimaryAdmin: r.is_primary_admin || false,
      joinedAt: r.joined_at,
    })),
  });
}

// ─── Update Member Role ───────────────────────────────────
export async function updateMemberRole(req, res) {
  const userId = req.user.userId;
  const teamId = parseInt(req.params.teamId);
  const memberId = parseInt(req.params.memberId);
  const { role } = req.body;

  if (!['admin', 'inspector', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role', code: 'VALIDATION_ERROR' });
  }

  // Must be admin
  const adminCheck = await query(
    'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
    [teamId, userId]
  );
  if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can change roles', code: 'FORBIDDEN' });
  }

  // Can't change own role (prevents losing last admin)
  const target = await query(
    'SELECT user_id, role FROM team_members WHERE id = $1 AND team_id = $2',
    [memberId, teamId]
  );
  if (target.rows.length === 0) {
    return res.status(404).json({ error: 'Member not found', code: 'NOT_FOUND' });
  }
  if (target.rows[0].user_id === userId) {
    return res.status(400).json({ error: 'Cannot change your own role', code: 'SELF_ROLE_CHANGE' });
  }

  const oldRole = target.rows[0].role;

  // Also update designation if provided
  const { designation } = req.body;
  const validDesignations = ['lead_inspector','lead_risk_assessor','ebl_investigator','clearance_technician','abatement_supervisor','abatement_worker','project_designer'];

  if (designation !== undefined) {
    if (designation !== null && !validDesignations.includes(designation)) {
      return res.status(400).json({ error: 'Invalid designation', code: 'VALIDATION_ERROR' });
    }
    await query('UPDATE team_members SET role = $1, designation = $2 WHERE id = $3', [role, designation, memberId]);
  } else {
    await query('UPDATE team_members SET role = $1 WHERE id = $2', [role, memberId]);
  }

  // Notify the member about role change
  const memberUser = await query('SELECT email, full_name FROM users WHERE id = $1', [target.rows[0].user_id]);
  const team = await query('SELECT name FROM teams WHERE id = $1', [teamId]);
  if (memberUser.rows[0]) {
    sendRoleChangedEmail(
      memberUser.rows[0].email,
      memberUser.rows[0].full_name,
      team.rows[0]?.name || 'the team',
      oldRole,
      role,
      req.user.fullName || req.user.email
    ).catch(err => console.error('Role changed email failed:', err.message));
  }

  res.json({ success: true });
}

// ─── Remove Member ────────────────────────────────────────
export async function removeMember(req, res) {
  const userId = req.user.userId;
  const teamId = parseInt(req.params.teamId);
  const memberId = parseInt(req.params.memberId);

  // Must be admin
  const adminCheck = await query(
    'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
    [teamId, userId]
  );
  if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can remove members', code: 'FORBIDDEN' });
  }

  const target = await query(
    'SELECT user_id FROM team_members WHERE id = $1 AND team_id = $2',
    [memberId, teamId]
  );
  if (target.rows.length === 0) {
    return res.status(404).json({ error: 'Member not found', code: 'NOT_FOUND' });
  }
  if (target.rows[0].user_id === userId) {
    return res.status(400).json({ error: 'Cannot remove yourself', code: 'SELF_REMOVE' });
  }

  await query('DELETE FROM team_members WHERE id = $1', [memberId]);

  // Clear their current_team_id if it was this team
  await query('UPDATE users SET current_team_id = NULL WHERE id = $1 AND current_team_id = $2',
    [target.rows[0].user_id, teamId]);

  // Get removed member info and notify them
  const removedUser = await query('SELECT email, full_name FROM users WHERE id = $1', [target.rows[0].user_id]);
  const team = await query('SELECT name FROM teams WHERE id = $1', [teamId]);
  if (removedUser.rows[0]) {
    sendMemberRemovedEmail(
      removedUser.rows[0].email,
      removedUser.rows[0].full_name,
      team.rows[0]?.name || 'the team',
      req.user.fullName || req.user.email
    ).catch(err => console.error('Member removed email failed:', err.message));
  }

  res.json({ success: true });
}

// ─── Create Invite ────────────────────────────────────────
export async function createInvite(req, res) {
  const userId = req.user.userId;
  const teamId = parseInt(req.params.teamId);
  const { email, role } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required', code: 'VALIDATION_ERROR' });
  }
  const inviteRole = ['admin', 'inspector', 'viewer'].includes(role) ? role : 'inspector';

  // Must be admin
  const adminCheck = await query(
    'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
    [teamId, userId]
  );
  if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can invite members', code: 'FORBIDDEN' });
  }

  // Check team member limit
  const team = await query('SELECT max_members FROM teams WHERE id = $1', [teamId]);
  const memberCount = await query('SELECT COUNT(*) FROM team_members WHERE team_id = $1', [teamId]);
  if (parseInt(memberCount.rows[0].count) >= team.rows[0].max_members) {
    return res.status(403).json({
      error: 'Team member limit reached. Upgrade your subscription to add more members.',
      code: 'MEMBER_LIMIT',
    });
  }

  // Check if already a member
  const existingMember = await query(
    `SELECT tm.id FROM team_members tm JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = $1 AND u.email = $2`,
    [teamId, email.toLowerCase()]
  );
  if (existingMember.rows.length > 0) {
    return res.status(409).json({ error: 'User is already a member of this team', code: 'ALREADY_MEMBER' });
  }

  // Check for existing pending invite
  const existingInvite = await query(
    `SELECT id FROM team_invites
     WHERE team_id = $1 AND email = $2 AND revoked = false AND accepted_at IS NULL AND expires_at > NOW()`,
    [teamId, email.toLowerCase()]
  );
  if (existingInvite.rows.length > 0) {
    return res.status(409).json({ error: 'A pending invite already exists for this email', code: 'INVITE_EXISTS' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const result = await query(
    `INSERT INTO team_invites (team_id, email, token, role, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, token, role, expires_at, created_at`,
    [teamId, email.toLowerCase(), token, inviteRole, userId, expiresAt]
  );

  const invite = result.rows[0];

  // Send invite email (fire and forget)
  const inviterResult = await query('SELECT full_name, email FROM users WHERE id = $1', [userId]);
  const inviterName = inviterResult.rows[0]?.full_name || inviterResult.rows[0]?.email || 'A team member';
  const teamResult2 = await query('SELECT name FROM teams WHERE id = $1', [teamId]);
  const teamName = teamResult2.rows[0]?.name || 'the team';
  sendTeamInviteEmail(invite.email, inviterName, teamName, invite.token, inviteRole).catch(err =>
    console.error('Team invite email failed:', err.message)
  );

  res.status(201).json({
    id: invite.id,
    email: invite.email,
    inviteToken: invite.token,
    role: invite.role,
    expiresAt: invite.expires_at,
    createdAt: invite.created_at,
    // Frontend builds the full invite URL
    inviteUrl: `/invite/${invite.token}`,
  });
}

// ─── List Pending Invites ─────────────────────────────────
export async function listInvites(req, res) {
  const userId = req.user.userId;
  const teamId = parseInt(req.params.teamId);

  // Verify membership
  const memberCheck = await query(
    'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
    [teamId, userId]
  );
  if (memberCheck.rows.length === 0) {
    return res.status(403).json({ error: 'Not a member of this team', code: 'FORBIDDEN' });
  }

  const result = await query(
    `SELECT ti.id, ti.email, ti.role, ti.created_at, ti.expires_at,
            u.full_name AS invited_by_name
     FROM team_invites ti
     JOIN users u ON u.id = ti.invited_by
     WHERE ti.team_id = $1 AND ti.revoked = false AND ti.accepted_at IS NULL AND ti.expires_at > NOW()
     ORDER BY ti.created_at DESC`,
    [teamId]
  );

  res.json({
    invites: result.rows.map(r => ({
      id: r.id,
      email: r.email,
      role: r.role,
      invitedBy: r.invited_by_name,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
    })),
  });
}

// ─── Revoke Invite ────────────────────────────────────────
export async function revokeInvite(req, res) {
  const userId = req.user.userId;
  const teamId = parseInt(req.params.teamId);
  const inviteId = parseInt(req.params.inviteId);

  const adminCheck = await query(
    'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
    [teamId, userId]
  );
  if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can revoke invites', code: 'FORBIDDEN' });
  }

  await query('UPDATE team_invites SET revoked = true WHERE id = $1 AND team_id = $2', [inviteId, teamId]);
  res.json({ success: true });
}

// ─── Get Invite Details (public, for invite page) ─────────
export async function getInviteDetails(req, res) {
  const { token } = req.params;

  const result = await query(
    `SELECT ti.id, ti.email, ti.role, ti.expires_at, t.name AS team_name, t.slug AS team_slug,
            u.full_name AS invited_by_name
     FROM team_invites ti
     JOIN teams t ON t.id = ti.team_id
     JOIN users u ON u.id = ti.invited_by
     WHERE ti.token = $1 AND ti.revoked = false AND ti.accepted_at IS NULL AND ti.expires_at > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Invite not found or expired', code: 'INVITE_INVALID' });
  }

  const inv = result.rows[0];
  res.json({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    teamName: inv.team_name,
    teamSlug: inv.team_slug,
    invitedBy: inv.invited_by_name,
    expiresAt: inv.expires_at,
  });
}

// ─── Accept Invite ────────────────────────────────────────
export async function acceptInvite(req, res) {
  const userId = req.user.userId;
  const { token } = req.params;

  const result = await query(
    `SELECT ti.id, ti.team_id, ti.email, ti.role, ti.invited_by
     FROM team_invites ti
     WHERE ti.token = $1 AND ti.revoked = false AND ti.accepted_at IS NULL AND ti.expires_at > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Invite not found or expired', code: 'INVITE_INVALID' });
  }

  const invite = result.rows[0];

  // Verify the invite email matches the authenticated user's email
  const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
  if (userResult.rows[0].email !== invite.email) {
    return res.status(403).json({
      error: 'This invite was sent to a different email address',
      code: 'EMAIL_MISMATCH',
    });
  }

  // Check if already a member
  const existingMember = await query(
    'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
    [invite.team_id, userId]
  );
  if (existingMember.rows.length > 0) {
    return res.status(409).json({ error: 'Already a member of this team', code: 'ALREADY_MEMBER' });
  }

  await withTransaction(async (client) => {
    // Add as member
    await client.query(
      'INSERT INTO team_members (team_id, user_id, role, invited_by) VALUES ($1, $2, $3, $4)',
      [invite.team_id, userId, invite.role, invite.invited_by]
    );

    // Mark invite as accepted
    await client.query('UPDATE team_invites SET accepted_at = NOW() WHERE id = $1', [invite.id]);

    // Set as user's current team
    await client.query('UPDATE users SET current_team_id = $1 WHERE id = $2', [invite.team_id, userId]);
  });

  // Notify the person who sent the invite
  const inviterResult = await query('SELECT u.email, u.full_name FROM users u WHERE u.id = $1', [invite.invited_by]);
  const teamNameResult = await query('SELECT name FROM teams WHERE id = $1', [invite.team_id]);
  if (inviterResult.rows[0]) {
    sendInviteAcceptedEmail(
      inviterResult.rows[0].email,
      inviterResult.rows[0].full_name,
      userResult.rows[0].full_name || userResult.rows[0].email,
      userResult.rows[0].email,
      teamNameResult.rows[0]?.name || 'the team',
      invite.role
    ).catch(err => console.error('Invite accepted email failed:', err.message));
  }

  res.json({
    success: true,
    teamId: invite.team_id,
    role: invite.role,
  });
}

// ─── Switch Active Team ───────────────────────────────────
export async function switchTeam(req, res) {
  const userId = req.user.userId;
  const { teamId } = req.body;

  if (teamId === null) {
    // Switch to personal (no team)
    await query('UPDATE users SET current_team_id = NULL WHERE id = $1', [userId]);
    return res.json({ success: true, currentTeamId: null });
  }

  // Verify membership
  const memberCheck = await query(
    'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
    [teamId, userId]
  );
  if (memberCheck.rows.length === 0) {
    return res.status(403).json({ error: 'Not a member of this team', code: 'FORBIDDEN' });
  }

  await query('UPDATE users SET current_team_id = $1 WHERE id = $2', [teamId, userId]);
  res.json({ success: true, currentTeamId: teamId });
}

// ─── Delete Team (soft-delete, keeps users) ─────────────
export async function deleteTeam(req, res) {
  const userId = req.user.userId;
  const teamId = parseInt(req.params.teamId);

  // Must be primary admin
  const userCheck = await query(
    'SELECT is_primary_admin FROM users WHERE id = $1',
    [userId]
  );
  if (!userCheck.rows[0]?.is_primary_admin) {
    return res.status(403).json({ error: 'Only the Primary Admin can delete teams', code: 'ADMIN_REQUIRED' });
  }

  // Soft-delete the team
  await query('UPDATE teams SET active = false, updated_at = NOW() WHERE id = $1', [teamId]);

  // Clear current_team_id for all members of this team
  await query(
    'UPDATE users SET current_team_id = NULL WHERE current_team_id = $1',
    [teamId]
  );

  // Revoke all pending invites for this team so nobody can accept them
  await query(
    'UPDATE team_invites SET revoked = true WHERE team_id = $1 AND revoked = false AND accepted_at IS NULL',
    [teamId]
  );

  // Note: team_members rows are kept (the team just becomes inactive)
  // Users are NOT deleted or deactivated

  res.json({ success: true });
}

// ─── Update Team Tier/Plan ───────────────────────────────
export async function updateTier(req, res) {
  const userId = req.user.userId;
  const teamId = parseInt(req.params.teamId);
  const { tier } = req.body;

  if (!['free', 'pro', 'team'].includes(tier)) {
    return res.status(400).json({ error: 'Invalid tier. Options: free, pro, team', code: 'VALIDATION_ERROR' });
  }

  // Must be primary admin OR team admin
  const userCheck = await query('SELECT is_primary_admin FROM users WHERE id = $1', [userId]);
  const memberCheck = await query(
    'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
    [teamId, userId]
  );

  const isPrimaryAdmin = userCheck.rows[0]?.is_primary_admin;
  const isTeamAdmin = memberCheck.rows.length > 0 && memberCheck.rows[0].role === 'admin';

  if (!isPrimaryAdmin && !isTeamAdmin) {
    return res.status(403).json({ error: 'Admin access required to change plan', code: 'FORBIDDEN' });
  }

  const limits = TIER_LIMITS[tier];

  await query(
    `UPDATE teams SET subscription_tier = $1, max_members = $2, max_projects = $3, updated_at = NOW()
     WHERE id = $4`,
    [tier, limits.maxMembers, limits.maxProjects, teamId]
  );

  res.json({
    success: true,
    tier,
    maxMembers: limits.maxMembers,
    maxProjects: limits.maxProjects,
  });
}

// ─── Leave Team ───────────────────────────────────────────
export async function leaveTeam(req, res) {
  const userId = req.user.userId;
  const teamId = parseInt(req.params.teamId);

  // Check if user is the only admin
  const admins = await query(
    "SELECT user_id FROM team_members WHERE team_id = $1 AND role = 'admin'",
    [teamId]
  );
  if (admins.rows.length === 1 && admins.rows[0].user_id === userId) {
    return res.status(400).json({
      error: 'You are the only admin. Promote another member before leaving.',
      code: 'LAST_ADMIN',
    });
  }

  await query('DELETE FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, userId]);
  await query('UPDATE users SET current_team_id = NULL WHERE id = $1 AND current_team_id = $2', [userId, teamId]);

  res.json({ success: true });
}
