-- Migration 032 (C57): Separate deactivation from suspension.
--
-- Prior state
--   deleteUser (the platform-admin "Deactivate" action) reused the
--   suspended_at and suspended_reason columns as the storage for soft-
--   deletion, with a magic string — 'Account deleted by platform admin' —
--   in suspended_reason being the only way to tell a deactivated row
--   apart from a manually-suspended one.
--
--   Migration 031 (C52) also used this pattern when soft-deleting the
--   legacy @nexdynegroup.com accounts, with a longer magic-string reason.
--
--   As a result, the admin Users panel's "Suspended" filter double-counts
--   everyone who was ever deactivated, and the UI's three status badges
--   (Active / Suspended / Inactive) collapse to two visible states in
--   practice — every non-active row renders as "Suspended".
--
-- New state
--   Two new dedicated columns — deactivated_at and deactivated_reason —
--   carry the soft-deletion lifecycle. suspended_at / suspended_reason
--   are now reserved for explicit, reversible suspensions with reasons
--   the admin actively authored.
--
--   A CHECK constraint enforces mutual exclusion: a user row cannot
--   simultaneously be suspended and deactivated. Reactivation clears
--   BOTH pairs (handled in the reactivateUser controller).
--
-- Backfill
--   For the two known legacy magic-string values, move values from the
--   suspended_* columns to the deactivated_* columns and NULL out the
--   suspended_* pair. Any other suspended_at-bearing row stays as a
--   proper suspension.
--
-- Idempotence
--   ADD COLUMN IF NOT EXISTS; the backfill WHERE targets only the known
--   magic strings, so re-running is a no-op. The CHECK constraint is
--   added once; re-running 032 is skipped by the migrations tracking
--   table (server/src/db/migrate.js).
--
-- Rollback
--   See the `DOWN` section at the bottom of this file. Not executed by
--   runMigrationsOnStartup — it's there as a human-followable recipe if
--   a revert is ever needed.


-- ─────────────────────────────────────────────────────────────
-- 1. Add the new columns.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deactivated_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivated_reason TEXT;


-- ─────────────────────────────────────────────────────────────
-- 2. Backfill known magic-string rows.
--    Exact match on reason — no LIKE, no substring. Protects against
--    accidentally flipping a legitimately-suspended user whose reason
--    happens to contain one of these fragments.
-- ─────────────────────────────────────────────────────────────

UPDATE users
SET
  deactivated_at     = suspended_at,
  deactivated_reason = suspended_reason,
  suspended_at       = NULL,
  suspended_reason   = NULL,
  updated_at         = NOW()
WHERE suspended_reason IN (
  'Account deleted by platform admin',
  'Legacy nexdyne account soft-deleted in C52 — pre-C39 platform migration, no active purpose'
);


-- ─────────────────────────────────────────────────────────────
-- 3. Enforce mutual exclusion AFTER the backfill (so existing rows
--    satisfy the invariant before the constraint is added).
-- ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_status_mutual_exclusion'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_status_mutual_exclusion
      CHECK (NOT (suspended_at IS NOT NULL AND deactivated_at IS NOT NULL));
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 4. Partial index for efficient filtering on the Deactivated tab.
--    Partial keeps it tiny — most users are active.
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_deactivated_at
  ON users (deactivated_at)
  WHERE deactivated_at IS NOT NULL;


-- ─────────────────────────────────────────────────────────────
-- DOWN (manual-only, not executed automatically)
-- ─────────────────────────────────────────────────────────────
-- -- Restore legacy layout: move deactivated_* back into suspended_*.
-- UPDATE users
-- SET
--   suspended_at     = deactivated_at,
--   suspended_reason = deactivated_reason,
--   deactivated_at   = NULL,
--   deactivated_reason = NULL,
--   updated_at       = NOW()
-- WHERE deactivated_at IS NOT NULL;
--
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_mutual_exclusion;
-- DROP INDEX IF EXISTS idx_users_deactivated_at;
-- ALTER TABLE users DROP COLUMN IF EXISTS deactivated_at;
-- ALTER TABLE users DROP COLUMN IF EXISTS deactivated_reason;
--
-- DELETE FROM migrations WHERE filename = '032_separate_deactivation_from_suspension.sql';
