-- Migration 027: Create canonical platform admin + support accounts
--
-- Inserts (idempotently):
--   admin@nexdynegroup.com   — primary platform admin (David's day-to-day owner account)
--   support@nexdynegroup.com — backup / support inbox, also platform admin
--
-- Both rows are inserted with a non-bcrypt placeholder password hash
-- ('!DISABLED!'). bcrypt.compare() always returns false against a non-bcrypt
-- string, so these accounts CANNOT be logged into until a password is set
-- via the bootstrap helper (see server/src/utils/bootstrapPlatformAdmin.js)
-- or the normal /api/auth/forgot-password flow once Resend is configured.
--
-- ON CONFLICT: if the email already exists (e.g. admin previously registered
-- manually), we only upgrade the is_platform_admin / email_verified flags —
-- we DO NOT touch the password_hash of a pre-existing row, to avoid locking
-- David out if he's already set a password.

INSERT INTO users (
  email,
  password_hash,
  full_name,
  role,
  is_platform_admin,
  is_primary_admin,
  must_change_password,
  email_verified,
  active
)
VALUES
  ('admin@nexdynegroup.com',   '!DISABLED!', 'Platform Admin',   'inspector', true, false, true, true, true),
  ('support@nexdynegroup.com', '!DISABLED!', 'Support (Backup)', 'inspector', true, false, true, true, true)
ON CONFLICT (email) DO UPDATE
SET
  is_platform_admin = true,
  email_verified    = true,
  active            = true,
  updated_at        = NOW();
