-- Migration 029: Move platform admin accounts from @nexdynegroup.com to @abatecomply.com
--
-- Context: migration 027 originally seeded admin@nexdynegroup.com +
-- support@nexdynegroup.com as the platform admin accounts. During live setup
-- (2026-04-20 pairing session) we discovered:
--   - nexdynegroup.com's DNS is NOT on the same Cloudflare account as
--     abatecomply.com, so Cloudflare Email Routing on nexdynegroup.com is not
--     a one-click path.
--   - David already has Google Workspace configured on abatecomply.com, so
--     admin@abatecomply.com and support@abatecomply.com are real, reachable
--     inboxes.
--
-- Decision: collapse everything onto abatecomply.com. The platform admin
-- accounts, the support inbox, and all outbound "from" addresses live on
-- one zone. nexdynegroup.com is no longer part of the LeadFlow stack.
--
-- This migration:
--   1. Inserts admin@abatecomply.com + support@abatecomply.com as
--      platform_admin rows with the '!DISABLED!' placeholder hash, so the
--      runtime bootstrap (BOOTSTRAP_PLATFORM_ADMIN=1) can issue real
--      passwords on the next deploy.
--   2. Demotes the old @nexdynegroup.com rows: strips is_platform_admin,
--      resets their password_hash to '!DISABLED!' so the temp passwords
--      generated on 2026-04-20 can no longer log in. Rows are kept (not
--      deleted) to avoid breaking any FK references in audit_logs etc.
--   3. ON CONFLICT on the INSERT upgrades the flags on the new rows if
--      they already existed for some reason — mirrors migration 027's
--      pattern — and crucially does NOT touch an existing bcrypt hash.

-- 1. Insert the new abatecomply platform admins (disabled until bootstrap).
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
  ('admin@abatecomply.com',   '!DISABLED!', 'Platform Admin',   'inspector', true, false, true, true, true),
  ('support@abatecomply.com', '!DISABLED!', 'Support (Backup)', 'inspector', true, false, true, true, true)
ON CONFLICT (email) DO UPDATE
SET
  is_platform_admin = true,
  email_verified    = true,
  active            = true,
  updated_at        = NOW();

-- 2. Demote the old nexdynegroup rows and disable their passwords.
--    Only touches rows that are currently marked platform_admin — this is
--    idempotent; re-running is a no-op if they're already demoted.
UPDATE users
SET
  is_platform_admin = false,
  password_hash     = '!DISABLED!',
  must_change_password = true,
  updated_at        = NOW()
WHERE email IN ('admin@nexdynegroup.com', 'support@nexdynegroup.com')
  AND is_platform_admin = true;
