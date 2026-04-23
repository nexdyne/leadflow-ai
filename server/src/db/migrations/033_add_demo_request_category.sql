-- Migration 033 (C63 hot-fix): allow 'demo_request' in support_tickets.category.
--
-- Prior state
--   Migration 028 defined support_tickets.category with a CHECK constraint
--   locked to ('general','bug','billing','feature','onboarding','account').
--   C63 added 'demo_request' to the application's VALID_CATEGORIES allowlist
--   in supportController.js, but didn't update the DB constraint. Result:
--   every demo-request form submission bubbled up as HTTP 500 with
--   'new row for relation "support_tickets" violates check constraint
--   "support_tickets_category_check"' (Postgres error 23514).
--
-- Fix
--   Drop the old CHECK and re-add it with 'demo_request' included.
--   Idempotent via DO $$ guards on pg_constraint so re-running the
--   migration (e.g., fresh DB bring-up) is safe.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_category_check'
  ) THEN
    ALTER TABLE support_tickets DROP CONSTRAINT support_tickets_category_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_category_check'
  ) THEN
    ALTER TABLE support_tickets
      ADD CONSTRAINT support_tickets_category_check
      CHECK (category IN (
        'general', 'bug', 'billing', 'feature', 'onboarding', 'account',
        'demo_request'
      ));
  END IF;
END $$;


-- DOWN (manual only)
-- ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_category_check;
-- ALTER TABLE support_tickets
--   ADD CONSTRAINT support_tickets_category_check
--   CHECK (category IN ('general','bug','billing','feature','onboarding','account'));
-- DELETE FROM migrations WHERE filename = '033_add_demo_request_category.sql';
