import cron from 'node-cron';
import { query } from '../db/connection.js';
import { sendDailyDigestEmail } from './email.js';

/**
 * Daily Digest Cron Job
 * Runs every hour and sends digests to users whose digest_hour matches the current hour.
 * This approach handles different user timezone preferences.
 */
async function runDailyDigest() {
  const currentHour = new Date().getUTCHours();
  console.log(`[Scheduler] Running daily digest check for hour ${currentHour} UTC`);

  try {
    // Find users who have daily digest enabled and whose preferred hour matches
    const users = await query(
      `SELECT np.user_id, u.email, u.full_name, u.role
       FROM notification_preferences np
       JOIN users u ON u.id = np.user_id
       WHERE np.email_daily_digest = true
         AND np.digest_hour = $1
         AND u.active = true
         AND u.suspended_at IS NULL`,
      [currentHour]
    );

    if (users.rows.length === 0) {
      console.log('[Scheduler] No users scheduled for digest this hour');
      return;
    }

    console.log(`[Scheduler] Sending digests to ${users.rows.length} users`);

    for (const user of users.rows) {
      try {
        const digest = await buildDigestForUser(user.user_id, user.role);
        if (digest.total > 0) {
          await sendDailyDigestEmail(user.email, user.full_name, digest);
          console.log(`[Scheduler] Digest sent to ${user.email}`);
        }
      } catch (err) {
        console.error(`[Scheduler] Digest failed for ${user.email}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Scheduler] Daily digest job failed:', err.message);
  }
}

/**
 * Build digest data for a specific user based on last 24 hours of activity
 */
async function buildDigestForUser(userId, role) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let newRequests = 0;
  let statusChanges = 0;
  let newMessages = 0;
  let completedInspections = 0;

  if (role === 'client') {
    // Client: count unread messages on their shared projects
    const msgResult = await query(
      `SELECT COUNT(*) FROM messages m
       JOIN client_projects cp ON cp.project_id = m.project_id AND cp.client_id = $1
       WHERE m.sender_id != $1 AND m.created_at > $2`,
      [userId, since]
    );
    newMessages = parseInt(msgResult.rows[0].count);

    // Client: count status changes on their projects
    const statusResult = await query(
      `SELECT COUNT(*) FROM notifications
       WHERE user_id = $1 AND type = 'status_change' AND created_at > $2`,
      [userId, since]
    );
    statusChanges = parseInt(statusResult.rows[0].count);

  } else {
    // Inspector/Admin: count new inspection requests
    const reqResult = await query(
      `SELECT COUNT(*) FROM notifications
       WHERE user_id = $1 AND type = 'request' AND created_at > $2`,
      [userId, since]
    );
    newRequests = parseInt(reqResult.rows[0].count);

    // Inspector: count new messages on their projects
    const msgResult = await query(
      `SELECT COUNT(*) FROM messages m
       JOIN projects p ON p.id = m.project_id
       WHERE (p.user_id = $1 OR p.team_id IN (SELECT team_id FROM team_members WHERE user_id = $1))
         AND m.sender_id != $1 AND m.created_at > $2`,
      [userId, since]
    );
    newMessages = parseInt(msgResult.rows[0].count);

    // Inspector: completed inspections
    const compResult = await query(
      `SELECT COUNT(*) FROM projects
       WHERE (user_id = $1 OR team_id IN (SELECT team_id FROM team_members WHERE user_id = $1))
         AND status = 'completed' AND status_updated_at > $2`,
      [userId, since]
    );
    completedInspections = parseInt(compResult.rows[0].count);
  }

  return {
    newRequests,
    statusChanges,
    newMessages,
    completedInspections,
    total: newRequests + statusChanges + newMessages + completedInspections,
  };
}

/**
 * Initialize all scheduled jobs
 */
export function initScheduler() {
  console.log('[Scheduler] Initializing scheduled jobs...');

  // Run daily digest check every hour at minute :00
  cron.schedule('0 * * * *', () => {
    runDailyDigest().catch(err => console.error('[Scheduler] Unhandled error:', err));
  });

  console.log('[Scheduler] Daily digest cron scheduled (runs every hour at :00)');
}
