import { query } from '../../db/connection.js';
import {
  sendSupportTicketAlert,
  sendSupportTicketAck,
} from '../../utils/email.js';

// ─── helpers ────────────────────────────────────────────

const VALID_CATEGORIES = ['general', 'bug', 'billing', 'feature', 'onboarding', 'account'];
const VALID_STATUSES   = ['new', 'open', 'waiting', 'resolved', 'closed'];
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const SUPPORT_INBOX = process.env.SUPPORT_INBOX || 'support@nexdynegroup.com';

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

// Very light per-IP rate limit to stop obvious spam: 10 tickets / hour / IP.
// Not bulletproof — just filters out obvious abuse without requiring Redis.
const submissionLog = new Map(); // ip -> [timestamps]
function rateLimitOk(ip) {
  if (!ip) return true;
  const now = Date.now();
  const cutoff = now - 60 * 60 * 1000;
  const hits = (submissionLog.get(ip) || []).filter(t => t > cutoff);
  hits.push(now);
  submissionLog.set(ip, hits);
  return hits.length <= 10;
}

// ═══════════════════════════════════════════════════════════
//  PUBLIC ENDPOINT — POST /api/support
// ═══════════════════════════════════════════════════════════

export async function createTicket(req, res) {
  const {
    name, email, phone, company,
    category, subject, message, pageUrl,
  } = req.body || {};

  if (!email || !subject || !message) {
    return res.status(400).json({
      error: 'email, subject, and message are required',
      code: 'VALIDATION_ERROR',
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address', code: 'VALIDATION_ERROR' });
  }
  if (subject.length > 255) {
    return res.status(400).json({ error: 'Subject is too long (max 255 chars)', code: 'VALIDATION_ERROR' });
  }
  if (message.length > 10000) {
    return res.status(400).json({ error: 'Message is too long (max 10,000 chars)', code: 'VALIDATION_ERROR' });
  }

  const cat = VALID_CATEGORIES.includes(category) ? category : 'general';
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || null;
  const userAgent = (req.headers['user-agent'] || '').substring(0, 500);

  if (!rateLimitOk(ip)) {
    return res.status(429).json({
      error: 'Too many support requests from this address. Please try again later.',
      code: 'RATE_LIMIT',
    });
  }

  // If the submitter is logged in, associate the ticket with their user id
  const userId = req.user?.userId || null;

  const insert = await query(
    `INSERT INTO support_tickets
      (name, email, phone, company, user_id, category, subject, message, page_url, user_agent, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id, created_at`,
    [
      name || null,
      email.toLowerCase(),
      phone || null,
      company || null,
      userId,
      cat,
      subject,
      message,
      (pageUrl || '').substring(0, 500) || null,
      userAgent || null,
      ip,
    ]
  );
  const ticket = {
    id: insert.rows[0].id,
    createdAt: insert.rows[0].created_at,
    name, email, phone, company,
    category: cat, subject, message,
    pageUrl, userAgent, ipAddress: ip,
  };

  // Fire-and-forget notification emails — don't block the submitter if Resend is down
  sendSupportTicketAlert(SUPPORT_INBOX, ticket)
    .catch(err => console.error('[support] alert email failed:', err.message));
  sendSupportTicketAck(email, name, ticket.id, subject)
    .catch(err => console.error('[support] ack email failed:', err.message));

  return res.status(201).json({
    success: true,
    ticketId: ticket.id,
    message: "Thanks — we've received your request. Check your email for confirmation.",
  });
}

// ═══════════════════════════════════════════════════════════
//  ADMIN — list / update tickets
// ═══════════════════════════════════════════════════════════

export async function listTickets(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const { status, priority, category, search, page = 1, limit = 25 } = req.query;
  const offset = (Math.max(1, parseInt(page)) - 1) * Math.max(1, parseInt(limit));

  const params = [];
  const where = [];
  if (status && VALID_STATUSES.includes(status)) {
    params.push(status); where.push(`t.status = $${params.length}`);
  }
  if (priority && VALID_PRIORITIES.includes(priority)) {
    params.push(priority); where.push(`t.priority = $${params.length}`);
  }
  if (category && VALID_CATEGORIES.includes(category)) {
    params.push(category); where.push(`t.category = $${params.length}`);
  }
  if (search) {
    params.push(`%${search.replace(/[%_\\]/g, '\\$&')}%`);
    where.push(`(t.subject ILIKE $${params.length} OR t.message ILIKE $${params.length} OR t.email ILIKE $${params.length} OR t.name ILIKE $${params.length})`);
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const [countResult, ticketsResult] = await Promise.all([
    query(`SELECT COUNT(*) FROM support_tickets t ${whereSql}`, params),
    query(
      `SELECT t.*,
              a.full_name AS assigned_name,
              a.email     AS assigned_email
       FROM support_tickets t
       LEFT JOIN users a ON a.id = t.assigned_to
       ${whereSql}
       ORDER BY CASE t.status
                  WHEN 'new' THEN 0
                  WHEN 'open' THEN 1
                  WHEN 'waiting' THEN 2
                  WHEN 'resolved' THEN 3
                  WHEN 'closed' THEN 4
                  ELSE 5 END,
                CASE t.priority
                  WHEN 'urgent' THEN 0
                  WHEN 'high' THEN 1
                  WHEN 'normal' THEN 2
                  WHEN 'low' THEN 3
                  ELSE 4 END,
                t.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Math.max(1, parseInt(limit)), offset]
    ),
  ]);

  // Aggregate counts by status for the tab badges
  const summary = await query(
    `SELECT status, COUNT(*)::int AS n FROM support_tickets GROUP BY status`
  );
  const byStatus = Object.fromEntries(summary.rows.map(r => [r.status, r.n]));

  res.json({
    tickets: ticketsResult.rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      company: r.company,
      userId: r.user_id,
      category: r.category,
      subject: r.subject,
      message: r.message,
      pageUrl: r.page_url,
      userAgent: r.user_agent,
      ipAddress: r.ip_address,
      status: r.status,
      priority: r.priority,
      assignedTo: r.assigned_to,
      assignedName: r.assigned_name,
      assignedEmail: r.assigned_email,
      adminNotes: r.admin_notes,
      resolvedAt: r.resolved_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    total: parseInt(countResult.rows[0].count),
    page: parseInt(page),
    limit: parseInt(limit),
    summary: {
      new:      byStatus.new      || 0,
      open:     byStatus.open     || 0,
      waiting:  byStatus.waiting  || 0,
      resolved: byStatus.resolved || 0,
      closed:   byStatus.closed   || 0,
    },
  });
}

export async function updateTicket(req, res) {
  try {
    await requirePlatformAdmin(req.user.userId);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  const id = parseInt(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ticket id' });

  const { status, priority, adminNotes, assignedTo } = req.body || {};

  const sets = [];
  const params = [];
  const push = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    push('status', status);
    if (status === 'resolved' || status === 'closed') {
      sets.push(`resolved_at = COALESCE(resolved_at, NOW())`);
    } else {
      sets.push(`resolved_at = NULL`);
    }
  }
  if (priority !== undefined) {
    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }
    push('priority', priority);
  }
  if (adminNotes !== undefined) push('admin_notes', adminNotes);
  if (assignedTo !== undefined) push('assigned_to', assignedTo === null ? null : parseInt(assignedTo));

  if (sets.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  sets.push(`updated_at = NOW()`);
  params.push(id);

  const result = await query(
    `UPDATE support_tickets SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id`,
    params
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  res.json({ success: true });
}
