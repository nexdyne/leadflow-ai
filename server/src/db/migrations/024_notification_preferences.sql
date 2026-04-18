-- ═══════════════════════════════════════════════════════════
-- Notification preferences: per-user email notification settings
-- Controls which email types a user receives
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Category toggles (all default ON)
  email_auth_alerts BOOLEAN DEFAULT true,       -- login alerts, password changes
  email_project_updates BOOLEAN DEFAULT true,   -- status changes, assignments
  email_messages BOOLEAN DEFAULT true,          -- new message notifications
  email_team_updates BOOLEAN DEFAULT true,      -- team invites, role changes
  email_inspection_alerts BOOLEAN DEFAULT true, -- request confirmations, scheduling
  email_admin_alerts BOOLEAN DEFAULT true,      -- admin-only: new users, system alerts
  email_daily_digest BOOLEAN DEFAULT false,     -- opt-in daily summary

  -- Digest timing preference
  digest_hour INTEGER DEFAULT 8,                -- hour of day (0-23) for digest, default 8 AM

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

-- Auto-create preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;
