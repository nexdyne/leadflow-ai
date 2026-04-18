import { query } from '../../db/connection.js';

// ─── Helper: create a notification ──────────────────────
export async function createNotification(userId, type, title, body, referenceId, referenceType) {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, body, reference_id, reference_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, type, title, body, referenceId || null, referenceType || null]
    );
  } catch (err) {
    // Log error but don't throw - notifications are non-critical
    console.error('Failed to create notification:', err);
  }
}

// ─── Endpoint: list user's notifications ────────────────
export async function listNotifications(req, res) {
  const userId = req.user.userId;
  const { limit = 20, offset = 0 } = req.query;
  const pageLimit = Math.min(parseInt(limit) || 20, 100);
  const pageOffset = parseInt(offset) || 0;

  const result = await query(
    `SELECT * FROM notifications
     WHERE user_id = $1
     ORDER BY is_read ASC, created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, pageLimit, pageOffset]
  );

  const countResult = await query(
    'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
    [userId]
  );

  res.json({
    notifications: result.rows.map(formatNotification),
    total: parseInt(countResult.rows[0].count),
    limit: pageLimit,
    offset: pageOffset,
  });
}

// ─── Endpoint: mark single notification as read ──────────
export async function markNotificationAsRead(req, res) {
  const userId = req.user.userId;
  const notificationId = parseInt(req.params.id);

  const notif = await query(
    'SELECT id, user_id FROM notifications WHERE id = $1',
    [notificationId]
  );

  if (notif.rows.length === 0) {
    return res.status(404).json({ error: 'Notification not found', code: 'NOT_FOUND' });
  }

  if (notif.rows[0].user_id !== userId) {
    return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
  }

  await query(
    'UPDATE notifications SET is_read = true, updated_at = NOW() WHERE id = $1',
    [notificationId]
  );

  res.json({ success: true });
}

// ─── Endpoint: mark all notifications as read ────────────
export async function markAllNotificationsAsRead(req, res) {
  const userId = req.user.userId;

  await query(
    'UPDATE notifications SET is_read = true, updated_at = NOW() WHERE user_id = $1 AND is_read = false',
    [userId]
  );

  res.json({ success: true });
}

// ─── Endpoint: get unread count ─────────────────────────
export async function getUnreadNotificationCount(req, res) {
  const userId = req.user.userId;

  const result = await query(
    'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
    [userId]
  );

  res.json({ unreadCount: parseInt(result.rows[0].count) });
}

// ═══════════════════════════════════════════════════════════
//  NOTIFICATION PREFERENCES
// ═══════════════════════════════════════════════════════════

// ─── Endpoint: get user's notification preferences ──────
export async function getNotificationPreferences(req, res) {
  const userId = req.user.userId;

  // Upsert: create default prefs if none exist
  let result = await query('SELECT * FROM notification_preferences WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) {
    await query('INSERT INTO notification_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [userId]);
    result = await query('SELECT * FROM notification_preferences WHERE user_id = $1', [userId]);
  }

  const prefs = result.rows[0];
  res.json({
    preferences: {
      emailAuthAlerts: prefs.email_auth_alerts,
      emailProjectUpdates: prefs.email_project_updates,
      emailMessages: prefs.email_messages,
      emailTeamUpdates: prefs.email_team_updates,
      emailInspectionAlerts: prefs.email_inspection_alerts,
      emailAdminAlerts: prefs.email_admin_alerts,
      emailDailyDigest: prefs.email_daily_digest,
      digestHour: prefs.digest_hour,
    },
  });
}

// ─── Endpoint: update notification preferences ──────────
export async function updateNotificationPreferences(req, res) {
  const userId = req.user.userId;
  const {
    emailAuthAlerts, emailProjectUpdates, emailMessages,
    emailTeamUpdates, emailInspectionAlerts, emailAdminAlerts,
    emailDailyDigest, digestHour,
  } = req.body;

  // Upsert preferences
  await query(
    `INSERT INTO notification_preferences (user_id, email_auth_alerts, email_project_updates, email_messages,
       email_team_updates, email_inspection_alerts, email_admin_alerts, email_daily_digest, digest_hour, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       email_auth_alerts = COALESCE($2, notification_preferences.email_auth_alerts),
       email_project_updates = COALESCE($3, notification_preferences.email_project_updates),
       email_messages = COALESCE($4, notification_preferences.email_messages),
       email_team_updates = COALESCE($5, notification_preferences.email_team_updates),
       email_inspection_alerts = COALESCE($6, notification_preferences.email_inspection_alerts),
       email_admin_alerts = COALESCE($7, notification_preferences.email_admin_alerts),
       email_daily_digest = COALESCE($8, notification_preferences.email_daily_digest),
       digest_hour = COALESCE($9, notification_preferences.digest_hour),
       updated_at = NOW()`,
    [userId,
     emailAuthAlerts ?? null, emailProjectUpdates ?? null, emailMessages ?? null,
     emailTeamUpdates ?? null, emailInspectionAlerts ?? null, emailAdminAlerts ?? null,
     emailDailyDigest ?? null, digestHour ?? null]
  );

  res.json({ success: true });
}

// ─── Helper: check if user has a preference enabled ─────
export async function userWantsEmail(userId, category) {
  try {
    const result = await query(
      `SELECT ${category} FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );
    if (result.rows.length === 0) return true; // default = send
    return result.rows[0][category] !== false;
  } catch {
    return true; // on error, default to sending
  }
}

// ─── Formatter ──────────────────────────────────────────
function formatNotification(n) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    referenceId: n.reference_id,
    referenceType: n.reference_type,
    isRead: n.is_read,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  };
}
