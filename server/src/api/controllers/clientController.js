import { query } from '../../db/connection.js';
import { createNotification } from './notificationController.js';
import {
  sendInspectionCompleteEmail,
  sendReportDeliveryEmail,
  sendClientPortalAccessEmail,
  sendInspectionScheduledEmail,
  sendInspectionRequestConfirmEmail,
  sendNewInspectionRequestAlertEmail,
  sendNewMessageEmail,
  sendClientAccessRevokedEmail,
  sendRequestAcceptedEmail,
  sendRequestDeclinedEmail,
  sendProjectStatusUpdateEmail,
} from '../../utils/email.js';

// ─── Helper: verify user is a client ────────────────────
async function requireClient(userId) {
  const r = await query('SELECT id, role FROM users WHERE id = $1', [userId]);
  if (r.rows.length === 0) throw Object.assign(new Error('User not found'), { status: 404 });
  if (r.rows[0].role !== 'client') throw Object.assign(new Error('Client access only'), { status: 403 });
  return r.rows[0];
}

// ─── Helper: verify user is inspector/admin ─────────────
async function requireInspector(userId) {
  const r = await query('SELECT id, role FROM users WHERE id = $1', [userId]);
  if (r.rows.length === 0) throw Object.assign(new Error('User not found'), { status: 404 });
  if (r.rows[0].role !== 'inspector') throw Object.assign(new Error('Inspector access only'), { status: 403 });
  return r.rows[0];
}

// ─── Helper: verify inspector can access project (owner or team member with edit rights) ───
async function verifyInspectorProjectAccess(userId, projectId) {
  const proj = await query(
    'SELECT id, user_id, team_id FROM projects WHERE id = $1 AND is_deleted = false',
    [projectId]
  );
  if (proj.rows.length === 0) return { ok: false, reason: 'Project not found', code: 'NOT_FOUND', status: 404 };

  if (proj.rows[0].user_id === userId) return { ok: true, project: proj.rows[0] };

  if (proj.rows[0].team_id) {
    const tm = await query(
      'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
      [proj.rows[0].team_id, userId]
    );
    if (tm.rows.length > 0 && tm.rows[0].role !== 'viewer') {
      return { ok: true, project: proj.rows[0] };
    }
  }

  return { ok: false, reason: 'You do not have access to this project', code: 'FORBIDDEN', status: 403 };
}

// ═══════════════════════════════════════════════════════════
//  CLIENT-FACING ENDPOINTS
// ═══════════════════════════════════════════════════════════

// GET /api/client/projects — list projects shared with this client
export async function listClientProjects(req, res) {
  try {
    await requireClient(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message, code: 'FORBIDDEN' });
  }

  const result = await query(
    `SELECT p.id, p.project_name, p.property_address, p.city, p.state_code,
            p.inspection_type, p.status, p.status_note, p.status_updated_at,
            p.updated_at, p.is_draft,
            u.full_name AS inspector_name, o.name AS inspector_company,
            u.suspended_at AS inspector_suspended
     FROM client_projects cp
     JOIN projects p ON p.id = cp.project_id AND p.is_deleted = false
     JOIN users u ON u.id = p.user_id
     LEFT JOIN organizations o ON o.id = u.organization_id
     WHERE cp.client_id = $1
     ORDER BY p.updated_at DESC`,
    [req.user.userId]
  );

  res.json({ projects: result.rows.map(formatProject) });
}

// GET /api/client/projects/:id — get single project details (if shared with client)
export async function getClientProject(req, res) {
  try {
    await requireClient(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message, code: 'FORBIDDEN' });
  }
  const { id } = req.params;

  const access = await query(
    'SELECT id FROM client_projects WHERE client_id = $1 AND project_id = $2',
    [req.user.userId, id]
  );
  if (access.rows.length === 0) {
    return res.status(403).json({ error: 'You do not have access to this project', code: 'FORBIDDEN' });
  }

  const result = await query(
    `SELECT p.id, p.project_name, p.property_address, p.city, p.state_code, p.zip,
            p.year_built, p.inspection_date, p.inspection_type, p.program_type,
            p.status, p.status_note, p.status_updated_at,
            p.state_data, p.updated_at, p.is_draft,
            u.full_name AS inspector_name, o.name AS inspector_company, u.email AS inspector_email
     FROM projects p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN organizations o ON o.id = u.organization_id
     WHERE p.id = $1 AND p.is_deleted = false`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Project not found', code: 'NOT_FOUND' });
  }

  const p = result.rows[0];
  // Client sees report data but not raw state_data internals
  const reportSummary = extractReportSummary(p.state_data);

  // Include full state_data for completed/delivered projects (enables report download)
  const includeStateData = ['completed', 'delivered'].includes(p.status);
  const stateData = includeStateData ? (typeof p.state_data === 'string' ? JSON.parse(p.state_data) : p.state_data) : null;

  res.json({
    project: {
      ...formatProject(p),
      inspectorEmail: p.inspector_email,
      yearBuilt: p.year_built,
      inspectionDate: p.inspection_date,
      programType: p.program_type,
      zip: p.zip,
      reportSummary,
      stateData,
    },
  });
}

// POST /api/client/requests — submit inspection request
export async function createInspectionRequest(req, res) {
  await requireClient(req.user.userId);

  const { propertyAddress, city, stateCode, zip, inspectionType, preferredDate, notes, contactPhone, teamId } = req.body;

  if (!propertyAddress) {
    return res.status(400).json({ error: 'Property address is required', code: 'VALIDATION_ERROR' });
  }

  const result = await query(
    `INSERT INTO inspection_requests
       (client_id, team_id, property_address, city, state_code, zip, inspection_type, preferred_date, notes, contact_phone)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [req.user.userId, teamId || null, propertyAddress, city || null, stateCode || 'MI', zip || null,
     inspectionType || null, preferredDate || null, notes || null, contactPhone || null]
  );

  const request = result.rows[0];

  // Send confirmation email to client
  const clientInfo = await query('SELECT email, full_name FROM users WHERE id = $1', [req.user.userId]);
  if (clientInfo.rows.length > 0) {
    sendInspectionRequestConfirmEmail(
      clientInfo.rows[0].email, clientInfo.rows[0].full_name,
      propertyAddress, inspectionType || null, preferredDate || null
    ).catch(err => console.error('Request confirm email failed:', err.message));
  }

  // Notify team inspectors or primary admin for unassigned requests
  if (teamId) {
    // Get all team members with inspector/admin role
    const teamMembers = await query(
      `SELECT tm.user_id, u.email, u.full_name FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1 AND tm.role IN ('admin', 'inspector')`,
      [teamId]
    );
    for (const member of teamMembers.rows) {
      await createNotification(
        member.user_id,
        'request',
        'New Inspection Request',
        `New inspection request for ${propertyAddress}`,
        request.id,
        'request'
      );
      // Email alert to each inspector
      sendNewInspectionRequestAlertEmail(
        member.email, member.full_name,
        clientInfo.rows[0]?.full_name || 'A client', clientInfo.rows[0]?.email || '',
        propertyAddress, inspectionType || null, preferredDate || null
      ).catch(err => console.error('Inspector request alert email failed:', err.message));
    }
  } else {
    // Get primary admin
    const admin = await query(
      'SELECT id, email, full_name FROM users WHERE is_primary_admin = true LIMIT 1'
    );
    if (admin.rows.length > 0) {
      await createNotification(
        admin.rows[0].id,
        'request',
        'New Unassigned Inspection Request',
        `New inspection request for ${propertyAddress} awaiting assignment`,
        request.id,
        'request'
      );
      sendNewInspectionRequestAlertEmail(
        admin.rows[0].email, admin.rows[0].full_name,
        clientInfo.rows[0]?.full_name || 'A client', clientInfo.rows[0]?.email || '',
        propertyAddress, inspectionType || null, preferredDate || null
      ).catch(err => console.error('Admin request alert email failed:', err.message));
    }
  }

  res.status(201).json({ request: formatRequest(request) });
}

// GET /api/client/requests — list my inspection requests
export async function listClientRequests(req, res) {
  await requireClient(req.user.userId);

  const result = await query(
    `SELECT ir.*, u.full_name AS reviewed_by_name
     FROM inspection_requests ir
     LEFT JOIN users u ON u.id = ir.reviewed_by
     WHERE ir.client_id = $1
     ORDER BY ir.created_at DESC`,
    [req.user.userId]
  );

  res.json({ requests: result.rows.map(formatRequest) });
}

// GET /api/client/messages/:projectId — get messages for a project
export async function listMessages(req, res) {
  await requireClient(req.user.userId);
  const { projectId } = req.params;

  // Verify access
  const access = await query(
    'SELECT id FROM client_projects WHERE client_id = $1 AND project_id = $2',
    [req.user.userId, projectId]
  );
  if (access.rows.length === 0) {
    return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
  }

  const result = await query(
    `SELECT m.id, m.content, m.created_at, m.is_read,
            u.id AS sender_id, u.full_name AS sender_name, u.role AS sender_role
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.project_id = $1
     ORDER BY m.created_at ASC`,
    [projectId]
  );

  // Mark unread messages as read for this client
  await query(
    'UPDATE messages SET is_read = true WHERE project_id = $1 AND sender_id != $2 AND is_read = false',
    [projectId, req.user.userId]
  );

  res.json({ messages: result.rows.map(formatMessage) });
}

// POST /api/client/messages/:projectId — send a message
export async function sendMessage(req, res) {
  await requireClient(req.user.userId);
  const { projectId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required', code: 'VALIDATION_ERROR' });
  }

  // Verify access
  const access = await query(
    'SELECT id FROM client_projects WHERE client_id = $1 AND project_id = $2',
    [req.user.userId, projectId]
  );
  if (access.rows.length === 0) {
    return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
  }

  const result = await query(
    'INSERT INTO messages (project_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
    [projectId, req.user.userId, content.trim()]
  );

  const message = result.rows[0];

  // Notify project owner (inspector) and team members
  const projectInfo = await query(
    `SELECT p.user_id, p.team_id, p.project_name FROM projects p WHERE id = $1`,
    [projectId]
  );
  const senderInfo = await query('SELECT full_name FROM users WHERE id = $1', [req.user.userId]);
  const senderName = senderInfo.rows[0]?.full_name || 'A client';

  if (projectInfo.rows.length > 0) {
    const project = projectInfo.rows[0];
    const preview = content.trim().substring(0, 80);
    // Notify project owner
    if (project.user_id) {
      await createNotification(
        project.user_id,
        'message',
        'New Message from Client',
        `Message on project: ${content.trim().substring(0, 50)}...`,
        message.id,
        'message'
      );
      // Email the project owner
      const ownerInfo = await query('SELECT email, full_name FROM users WHERE id = $1', [project.user_id]);
      if (ownerInfo.rows.length > 0) {
        sendNewMessageEmail(ownerInfo.rows[0].email, ownerInfo.rows[0].full_name, senderName, 'Client', project.project_name, preview)
          .catch(err => console.error('Message email failed:', err.message));
      }
    }
    // Notify team members
    if (project.team_id) {
      const teamMembers = await query(
        `SELECT tm.user_id, u.email, u.full_name FROM team_members tm
         JOIN users u ON u.id = tm.user_id
         WHERE tm.team_id = $1 AND tm.role IN ('admin', 'inspector')`,
        [project.team_id]
      );
      for (const member of teamMembers.rows) {
        if (member.user_id !== project.user_id) {
          await createNotification(
            member.user_id,
            'message',
            'New Message from Client',
            `Message on project: ${content.trim().substring(0, 50)}...`,
            message.id,
            'message'
          );
          sendNewMessageEmail(member.email, member.full_name, senderName, 'Client', project.project_name, preview)
            .catch(err => console.error('Message email failed:', err.message));
        }
      }
    }
  }

  res.status(201).json({ message: { ...formatMessage(message), senderName: 'You', senderRole: 'client' } });
}

// GET /api/client/unread — count of unread messages across all projects
export async function getUnreadCount(req, res) {
  await requireClient(req.user.userId);

  const result = await query(
    `SELECT COUNT(*) FROM messages m
     JOIN client_projects cp ON cp.project_id = m.project_id AND cp.client_id = $1
     WHERE m.sender_id != $1 AND m.is_read = false`,
    [req.user.userId]
  );

  res.json({ unreadCount: parseInt(result.rows[0].count) });
}


// ═══════════════════════════════════════════════════════════
//  INSPECTOR-FACING ENDPOINTS (manage client access)
// ═══════════════════════════════════════════════════════════

// POST /api/client/share — share a project with a client by email
export async function shareProject(req, res) {
  await requireInspector(req.user.userId);
  const { projectId, clientEmail } = req.body;

  if (!projectId || !clientEmail) {
    return res.status(400).json({ error: 'projectId and clientEmail are required', code: 'VALIDATION_ERROR' });
  }

  // Verify inspector owns this project
  const proj = await query(
    'SELECT id, user_id, team_id FROM projects WHERE id = $1 AND is_deleted = false',
    [projectId]
  );
  if (proj.rows.length === 0) {
    return res.status(404).json({ error: 'Project not found', code: 'NOT_FOUND' });
  }
  if (proj.rows[0].user_id !== req.user.userId) {
    // Check team membership
    if (proj.rows[0].team_id) {
      const tm = await query(
        'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
        [proj.rows[0].team_id, req.user.userId]
      );
      if (tm.rows.length === 0 || tm.rows[0].role === 'viewer') {
        return res.status(403).json({ error: 'You cannot share this project', code: 'FORBIDDEN' });
      }
    } else {
      return res.status(403).json({ error: 'You do not own this project', code: 'FORBIDDEN' });
    }
  }

  // Find client user
  const clientUser = await query(
    'SELECT id, role, full_name FROM users WHERE email = $1 AND active = true',
    [clientEmail.toLowerCase()]
  );
  if (clientUser.rows.length === 0) {
    return res.status(404).json({
      error: 'No client account found with that email. The client must register at /portal first.',
      code: 'CLIENT_NOT_FOUND',
    });
  }
  if (clientUser.rows[0].role !== 'client') {
    return res.status(400).json({
      error: 'That email belongs to an inspector account, not a client.',
      code: 'NOT_CLIENT',
    });
  }

  // Create or ignore if already shared
  const shareResult = await query(
    `INSERT INTO client_projects (client_id, project_id, granted_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (client_id, project_id) DO UPDATE SET updated_at = NOW()
     RETURNING project_id`,
    [clientUser.rows[0].id, projectId, req.user.userId]
  );

  // Notify client that project was shared
  if (shareResult.rows.length > 0) {
    const projectInfo = await query(
      'SELECT project_name FROM projects WHERE id = $1',
      [projectId]
    );
    if (projectInfo.rows.length > 0) {
      const projectName = projectInfo.rows[0].project_name;

      // Create notification
      await createNotification(
        clientUser.rows[0].id,
        'project_shared',
        'Project Shared with You',
        `You now have access to: ${projectName}`,
        projectId,
        'project'
      );

      // Send email with portal access details
      await sendClientPortalAccessEmail(
        clientEmail.toLowerCase(),
        clientUser.rows[0].full_name || 'Client',
        projectName,
        `${process.env.APP_URL || 'https://leadflow-ai-production-11f3.up.railway.app'}/portal`
      ).catch(err => console.error('Client portal access email failed:', err.message));
    }
  }

  res.json({ success: true, clientEmail: clientEmail.toLowerCase() });
}

// DELETE /api/client/share — revoke client access to a project
export async function revokeProjectAccess(req, res) {
  await requireInspector(req.user.userId);
  const { projectId, clientId } = req.body;

  if (!projectId || !clientId) {
    return res.status(400).json({ error: 'projectId and clientId are required', code: 'VALIDATION_ERROR' });
  }

  // Verify inspector owns/can access this project
  const access = await verifyInspectorProjectAccess(req.user.userId, projectId);
  if (!access.ok) {
    return res.status(access.status).json({ error: access.reason, code: access.code });
  }

  // Get client and project info before deleting
  const revokeClient = await query('SELECT email, full_name FROM users WHERE id = $1', [clientId]);
  const revokeProject = await query('SELECT project_name FROM projects WHERE id = $1', [projectId]);
  const revoker = await query('SELECT full_name FROM users WHERE id = $1', [req.user.userId]);

  await query(
    'DELETE FROM client_projects WHERE client_id = $1 AND project_id = $2',
    [clientId, projectId]
  );

  // Notify client their access was revoked
  if (revokeClient.rows.length > 0 && revokeProject.rows.length > 0) {
    sendClientAccessRevokedEmail(
      revokeClient.rows[0].email,
      revokeClient.rows[0].full_name,
      revokeProject.rows[0].project_name,
      revoker.rows[0]?.full_name || 'An administrator'
    ).catch(err => console.error('Client access revoked email failed:', err.message));
  }

  res.json({ success: true });
}

// GET /api/client/shared/:projectId — list clients who have access to a project
export async function listProjectClients(req, res) {
  await requireInspector(req.user.userId);
  const { projectId } = req.params;

  // Verify inspector owns/can access this project
  const access = await verifyInspectorProjectAccess(req.user.userId, projectId);
  if (!access.ok) {
    return res.status(access.status).json({ error: access.reason, code: access.code });
  }

  const result = await query(
    `SELECT cp.id, cp.granted_at, u.id AS client_id, u.email, u.full_name, u.company_name
     FROM client_projects cp
     JOIN users u ON u.id = cp.client_id
     WHERE cp.project_id = $1
     ORDER BY cp.granted_at DESC`,
    [projectId]
  );

  res.json({
    clients: result.rows.map(r => ({
      id: r.id,
      clientId: r.client_id,
      email: r.email,
      fullName: r.full_name,
      companyName: r.company_name,
      grantedAt: r.granted_at,
    })),
  });
}

// GET /api/client/projects/shared-with-clients — list inspector's projects that have been shared with any client
export async function listSharedWithClients(req, res) {
  await requireInspector(req.user.userId);
  const userId = req.user.userId;

  // Get all projects the inspector owns or has team access to, that have at least one client_projects entry
  const result = await query(
    `SELECT DISTINCT p.id, p.project_name, p.address, p.city, p.state, p.status, p.is_draft, p.updated_at,
            (SELECT COUNT(*) FROM client_projects cp2 WHERE cp2.project_id = p.id) AS client_count
     FROM projects p
     JOIN client_projects cp ON cp.project_id = p.id
     LEFT JOIN team_members tm ON tm.team_id = p.team_id AND tm.user_id = $1
     WHERE p.is_deleted = false
       AND (p.user_id = $1 OR (tm.user_id IS NOT NULL AND tm.role != 'viewer'))
     ORDER BY p.updated_at DESC`,
    [userId]
  );

  res.json({
    projects: result.rows.map(r => ({
      id: r.id,
      projectName: r.project_name || 'Untitled Project',
      address: r.address,
      city: r.city,
      state: r.state,
      status: r.status,
      isDraft: r.is_draft,
      clientCount: parseInt(r.client_count),
      updatedAt: r.updated_at,
    })),
  });
}

// GET /api/client/requests/incoming — list inspection requests for inspector's team
export async function listIncomingRequests(req, res) {
  await requireInspector(req.user.userId);

  // Get inspector's organization
  const inspectorOrgResult = await query(
    'SELECT organization_id FROM users WHERE id = $1',
    [req.user.userId]
  );
  if (inspectorOrgResult.rows.length === 0) {
    return res.status(404).json({ error: 'Inspector not found', code: 'NOT_FOUND' });
  }
  const inspectorOrgId = inspectorOrgResult.rows[0].organization_id;

  // Get requests:
  // 1. Sent to inspector's teams, OR
  // 2. Unassigned (team_id IS NULL) but only if inspector is primary admin of their org
  const result = await query(
    `SELECT ir.*, u.full_name AS client_name, u.email AS client_email, u.company_name AS client_company
     FROM inspection_requests ir
     JOIN users u ON u.id = ir.client_id
     WHERE ir.team_id IN (SELECT team_id FROM team_members WHERE user_id = $1)
        OR (ir.team_id IS NULL AND EXISTS (
          SELECT 1 FROM users
          WHERE id = $2 AND is_primary_admin = true AND organization_id = $3
        ))
     ORDER BY ir.created_at DESC`,
    [req.user.userId, req.user.userId, inspectorOrgId]
  );

  res.json({ requests: result.rows.map(r => ({
    ...formatRequest(r),
    clientName: r.client_name,
    clientEmail: r.client_email,
    clientCompany: r.client_company,
  }))});
}

// PUT /api/client/requests/:id/review — accept or decline a request
export async function reviewRequest(req, res) {
  await requireInspector(req.user.userId);
  const { id } = req.params;
  const { status, responseNote, projectId } = req.body;

  if (!['accepted', 'declined', 'scheduled', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status', code: 'VALIDATION_ERROR' });
  }

  // Verify request exists and inspector has access (their team or unassigned)
  const reqCheck = await query(
    `SELECT ir.id, ir.status, ir.team_id
     FROM inspection_requests ir
     WHERE ir.id = $1`,
    [id]
  );
  if (reqCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Request not found', code: 'NOT_FOUND' });
  }

  const request = reqCheck.rows[0];

  // Check inspector is on the assigned team (or request is unassigned)
  if (request.team_id) {
    const teamCheck = await query(
      'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
      [request.team_id, req.user.userId]
    );
    if (teamCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not on the team assigned to this request', code: 'FORBIDDEN' });
    }
  }

  // Guard: prevent re-reviewing already completed/declined requests
  if (['completed', 'declined'].includes(request.status) && request.status !== status) {
    return res.status(400).json({
      error: `This request has already been ${request.status}. Create a new request instead.`,
      code: 'ALREADY_REVIEWED',
    });
  }

  const updateResult = await query(
    `UPDATE inspection_requests
     SET status = $1, reviewed_by = $2, reviewed_at = NOW(), response_note = $3,
         project_id = $4, updated_at = NOW()
     WHERE id = $5
     RETURNING client_id, property_address, preferred_date`,
    [status, req.user.userId, responseNote || null, projectId || null, id]
  );

  if (updateResult.rows.length > 0) {
    const { client_id, property_address, preferred_date } = updateResult.rows[0];
    const statusMessages = {
      accepted: 'Your inspection request has been accepted',
      declined: 'Your inspection request has been reviewed',
      scheduled: 'Your inspection has been scheduled',
      completed: 'Your inspection has been completed',
    };
    await createNotification(
      client_id,
      'status_change',
      statusMessages[status] || 'Request Updated',
      `Status for ${property_address}: ${status}`,
      id,
      'request'
    );

    // Send email notification for accepted/declined status
    if (status === 'accepted' || status === 'declined') {
      const clientInfo2 = await query('SELECT email, full_name FROM users WHERE id = $1', [client_id]);
      const inspInfo = await query('SELECT full_name FROM users WHERE id = $1', [req.user.userId]);
      if (clientInfo2.rows.length > 0) {
        const emailFn = status === 'accepted' ? sendRequestAcceptedEmail : sendRequestDeclinedEmail;
        emailFn(
          clientInfo2.rows[0].email, clientInfo2.rows[0].full_name,
          property_address, inspInfo.rows[0]?.full_name || 'Your Inspector',
          req.body.responseNote || null
        ).catch(err => console.error(`Request ${status} email failed:`, err.message));
      }
    }

    // Send email notification for scheduled status
    if (status === 'scheduled' && projectId) {
      const projectInfo = await query(
        'SELECT project_name FROM projects WHERE id = $1',
        [projectId]
      );
      const inspectorInfo = await query(
        'SELECT u.full_name FROM users u WHERE u.id = $1',
        [req.user.userId]
      );
      const clientInfo = await query(
        'SELECT email, full_name FROM users WHERE id = $1',
        [client_id]
      );

      if (projectInfo.rows.length > 0 && clientInfo.rows.length > 0) {
        const projectName = projectInfo.rows[0].project_name;
        const inspectorName = inspectorInfo.rows[0]?.full_name || 'Your Inspector';
        const clientEmail = clientInfo.rows[0].email;
        const clientName = clientInfo.rows[0].full_name;
        const scheduledDate = preferred_date || new Date().toISOString();

        await sendInspectionScheduledEmail(
          clientEmail,
          clientName,
          projectName,
          property_address,
          inspectorName,
          scheduledDate
        ).catch(err => console.error('Inspection scheduled email failed:', err.message));
      }
    }
  }

  res.json({ success: true });
}

// POST /api/client/messages/:projectId/inspector — inspector sends message to client on a project
export async function inspectorSendMessage(req, res) {
  await requireInspector(req.user.userId);
  const { projectId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required', code: 'VALIDATION_ERROR' });
  }

  // Verify inspector owns/can access this project
  const access = await verifyInspectorProjectAccess(req.user.userId, projectId);
  if (!access.ok) {
    return res.status(access.status).json({ error: access.reason, code: access.code });
  }

  const result = await query(
    'INSERT INTO messages (project_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
    [projectId, req.user.userId, content.trim()]
  );

  const message = result.rows[0];

  // Notify all clients on this project
  const projectInfo2 = await query('SELECT project_name FROM projects WHERE id = $1', [projectId]);
  const inspectorInfo2 = await query('SELECT full_name FROM users WHERE id = $1', [req.user.userId]);
  const projName = projectInfo2.rows[0]?.project_name || 'Your Project';
  const inspName = inspectorInfo2.rows[0]?.full_name || 'Your Inspector';
  const preview2 = content.trim().substring(0, 80);

  const clients = await query(
    `SELECT cp.client_id, u.email, u.full_name FROM client_projects cp
     JOIN users u ON u.id = cp.client_id
     WHERE cp.project_id = $1`,
    [projectId]
  );
  for (const client of clients.rows) {
    await createNotification(
      client.client_id,
      'message',
      'New Message from Inspector',
      `Message on your project: ${content.trim().substring(0, 50)}...`,
      message.id,
      'message'
    );
    sendNewMessageEmail(client.email, client.full_name, inspName, 'Inspector', projName, preview2)
      .catch(err => console.error('Message email to client failed:', err.message));
  }

  res.status(201).json({ message: { ...formatMessage(message), senderName: 'You', senderRole: 'inspector' } });
}

// GET /api/client/messages/:projectId/inspector — inspector reads messages for a project
export async function inspectorListMessages(req, res) {
  await requireInspector(req.user.userId);
  const { projectId } = req.params;

  // Verify inspector owns/can access this project
  const access = await verifyInspectorProjectAccess(req.user.userId, projectId);
  if (!access.ok) {
    return res.status(access.status).json({ error: access.reason, code: access.code });
  }

  const result = await query(
    `SELECT m.id, m.content, m.created_at, m.is_read,
            u.id AS sender_id, u.full_name AS sender_name, u.role AS sender_role
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.project_id = $1
     ORDER BY m.created_at ASC`,
    [projectId]
  );

  // Mark client messages as read
  await query(
    'UPDATE messages SET is_read = true WHERE project_id = $1 AND sender_id != $2 AND is_read = false',
    [projectId, req.user.userId]
  );

  res.json({ messages: result.rows.map(formatMessage) });
}

// PUT /api/client/projects/:id/status — inspector updates project status
export async function updateProjectStatus(req, res) {
  await requireInspector(req.user.userId);
  const { id } = req.params;
  const { status, statusNote } = req.body;

  const validStatuses = ['draft', 'scheduled', 'in_progress', 'completed', 'delivered'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status', code: 'VALIDATION_ERROR' });
  }

  // Verify inspector owns/can access this project
  const access = await verifyInspectorProjectAccess(req.user.userId, id);
  if (!access.ok) {
    return res.status(access.status).json({ error: access.reason, code: access.code });
  }

  const updateResult = await query(
    `UPDATE projects SET status = $1, status_note = $2, status_updated_at = NOW(), updated_at = NOW()
     WHERE id = $3
     RETURNING project_name`,
    [status, statusNote || null, id]
  );

  if (updateResult.rows.length > 0) {
    // Notify all clients on this project
    const clients = await query(
      `SELECT client_id FROM client_projects WHERE project_id = $1`,
      [id]
    );
    const projectName = updateResult.rows[0].project_name;
    for (const client of clients.rows) {
      await createNotification(
        client.client_id,
        'status_change',
        'Project Status Updated',
        `${projectName} status changed to: ${status}`,
        id,
        'project'
      );
    }

    // Send email for all status changes
    if (status === 'scheduled' || status === 'in_progress') {
      // Generic status update email for non-terminal statuses
      for (const client of clients.rows) {
        const clientInfo3 = await query('SELECT email, full_name FROM users WHERE id = $1', [client.client_id]);
        if (clientInfo3.rows.length > 0) {
          sendProjectStatusUpdateEmail(
            clientInfo3.rows[0].email, clientInfo3.rows[0].full_name,
            projectName, status, statusNote || null
          ).catch(err => console.error('Status update email failed:', err.message));
        }
      }
    }
    if (status === 'completed' || status === 'delivered') {
      const inspector = await query(
        `SELECT u.full_name, o.name AS company FROM users u LEFT JOIN organizations o ON o.id = u.organization_id WHERE u.id = $1`,
        [req.user.userId]
      );
      const inspectorName = inspector.rows[0]?.full_name || 'Your inspector';
      const inspectorCompany = inspector.rows[0]?.company || '';

      for (const client of clients.rows) {
        const clientInfo = await query('SELECT email, full_name FROM users WHERE id = $1', [client.client_id]);
        if (clientInfo.rows.length > 0) {
          const emailFn = status === 'completed' ? sendInspectionCompleteEmail : sendReportDeliveryEmail;
          if (status === 'completed') {
            sendInspectionCompleteEmail(clientInfo.rows[0].email, clientInfo.rows[0].full_name, projectName, inspectorName, inspectorCompany)
              .catch(err => console.error('Inspection complete email failed:', err.message));
          } else {
            sendReportDeliveryEmail(clientInfo.rows[0].email, clientInfo.rows[0].full_name, projectName, 'Inspection Report')
              .catch(err => console.error('Report delivery email failed:', err.message));
          }
        }
      }
    }
  }

  res.json({ success: true });
}


// ─── Formatters ─────────────────────────────────────────
function formatProject(p) {
  return {
    id: p.id,
    projectName: p.project_name,
    propertyAddress: p.property_address,
    city: p.city,
    stateCode: p.state_code,
    inspectionType: p.inspection_type,
    status: p.status || 'draft',
    statusNote: p.status_note,
    statusUpdatedAt: p.status_updated_at,
    updatedAt: p.updated_at,
    isDraft: p.is_draft,
    inspectorName: p.inspector_name,
    inspectorCompany: p.inspector_company,
    inspectorSuspended: !!p.inspector_suspended,
  };
}

function formatRequest(r) {
  return {
    id: r.id,
    propertyAddress: r.property_address,
    city: r.city,
    stateCode: r.state_code,
    zip: r.zip,
    inspectionType: r.inspection_type,
    preferredDate: r.preferred_date,
    notes: r.notes,
    contactPhone: r.contact_phone,
    status: r.status,
    responseNote: r.response_note,
    reviewedByName: r.reviewed_by_name,
    reviewedAt: r.reviewed_at,
    projectId: r.project_id,
    createdAt: r.created_at,
  };
}

function formatMessage(m) {
  return {
    id: m.id,
    content: m.content,
    createdAt: m.created_at,
    isRead: m.is_read,
    senderId: m.sender_id,
    senderName: m.sender_name,
    senderRole: m.sender_role,
  };
}

function extractReportSummary(stateData) {
  if (!stateData) return null;
  try {
    const data = typeof stateData === 'string' ? JSON.parse(stateData) : stateData;
    // Extract hazard details for client-facing display
    const hazards = (data.hazardAnalysis?.hazards || []).map(h => ({
      room: h.room || h.location || 'Unknown',
      component: h.component || h.substrate || 'Unknown',
      reading: h.reading || h.result || null,
      result: h.result || (h.reading >= 1.0 ? 'Positive' : 'Negative'),
      recommendation: h.recommendation || h.action || null,
    }));
    return {
      propertyAddress: data.projectInfo?.propertyAddress,
      inspectionDate: data.projectInfo?.inspectionDate,
      inspectorName: data.projectInfo?.inspectorName,
      programType: data.projectInfo?.programType,
      roomCount: data.xrfData?.rooms?.length || 0,
      hazardCount: hazards.filter(h => h.result === 'Positive' || (h.reading && h.reading >= 1.0)).length || data.hazardAnalysis?.hazards?.length || 0,
      complianceStatus: data.compliance?.overallStatus,
      hazards,
    };
  } catch {
    return null;
  }
}
