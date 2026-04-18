-- Migration 021: Platform Admin role + audit logs + announcements + subscription tracking
-- This adds the "platform owner" layer — the SaaS owner who manages ALL clients/orgs

-- 1. Add is_platform_admin flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT false;

-- 2. Audit logs — tracks every significant action across the platform
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES users(id),
  actor_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,        -- 'user.created', 'user.suspended', 'org.updated', etc.
  target_type VARCHAR(50),             -- 'user', 'organization', 'team', 'project', 'subscription'
  target_id INTEGER,
  details JSONB DEFAULT '{}',          -- flexible metadata
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- 3. Platform announcements — broadcast messages from owner to all users
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(30) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'critical', 'feature', 'maintenance')),
  target_audience VARCHAR(30) DEFAULT 'all' CHECK (target_audience IN ('all', 'inspectors', 'clients')),
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, starts_at, expires_at);

-- 4. Announcement dismissals — track which users dismissed which announcements
CREATE TABLE IF NOT EXISTS announcement_dismissals (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- 5. Add subscription/billing fields to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(30) DEFAULT 'free';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(30) DEFAULT 'active';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS monthly_rate DECIMAL(10,2) DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS notes TEXT;

-- 6. Add suspension fields to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
