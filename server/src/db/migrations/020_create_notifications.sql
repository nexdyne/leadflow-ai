-- ═══════════════════════════════════════════════════════════
-- Notifications table: in-app notifications for users
-- Tracks all notifications sent to users (messages, requests, status changes, etc.)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,  -- 'message', 'request', 'status_change', 'project_shared', 'team_invite'
  title VARCHAR(255) NOT NULL,
  body TEXT,
  reference_id INTEGER,       -- project_id, request_id, message_id, etc.
  reference_type VARCHAR(50), -- 'project', 'request', 'team', 'message'
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
