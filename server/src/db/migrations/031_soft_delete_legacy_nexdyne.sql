-- Migration 031: Soft-delete legacy @nexdynegroup.com platform admin rows
--
-- Context: Migration 029 (C39) demoted admin@nexdynegroup.com and
-- support@nexdynegroup.com — it flipped is_platform_admin=false and
-- disabled their password hashes — but left active=true on both rows.
-- As a result they still appear in the /admin Users tab, with their
-- original cosmetic full_name values ("Platform Admin" and
-- "Support (Backup)"), which reads confusing: a user scanning the list
-- sees two rows literally named "Platform Admin" that are NOT actually
-- platform admins (they're demoted regular inspector rows).
--
-- Decision (C52, 2026-04-22): soft-delete them. They have no active
-- purpose — the LeadFlow stack now runs entirely on abatecomply.com
-- (C39), and these rows were kept only to preserve FK integrity on any
-- audit_logs/projects rows they may have authored.
--
-- Soft-delete (active=false + suspended_at + suspended_reason) is
-- reversible: flipping active=true via the admin UI's Reactivate button
-- restores them immediately. FK references stay intact.
--
-- Idempotent: WHERE active = true gates against re-running.

UPDATE users
SET
  active            = false,
  suspended_at      = NOW(),
  suspended_reason  = 'Legacy nexdyne account soft-deleted in C52 — pre-C39 platform migration, no active purpose',
  updated_at        = NOW()
WHERE email IN ('admin@nexdynegroup.com', 'support@nexdynegroup.com')
  AND active = true;
