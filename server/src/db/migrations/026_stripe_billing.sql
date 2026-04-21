-- ═══════════════════════════════════════════════════════════
-- Migration 026: Stripe billing schema (scaffold)
--
-- Adds the tables needed to persist Stripe billing state so that
-- MRR / subscription status / invoice history stop being admin-typed
-- values and start reflecting actual customer payments.
--
-- This migration is SAFE to run even before Stripe is wired — it
-- only creates tables and adds nullable columns. The backend
-- billing layer (commit 28) is gated behind STRIPE_SECRET_KEY so
-- none of these rows will be written until Stripe is configured.
--
-- What this does NOT do:
--   - Does NOT remove organizations.monthly_rate. That column stays
--     as the admin-override for customers who aren't on Stripe (e.g.
--     the Haase/ATCS pilot, purchase-order customers).
--   - Does NOT backfill any data. Stripe will populate rows on its
--     first webhook event after keys are set.
--   - Does NOT modify any existing constraints.
-- ═══════════════════════════════════════════════════════════


-- 1. Link organizations to Stripe customers
-- The stripe_customer_id stays NULL until the first checkout or webhook.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(64) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;


-- 2. billing_plans: the catalog of plans we offer
-- Each row corresponds to a Stripe Price. Admin can seed rows via
-- direct SQL to match the prices they've created in Stripe Dashboard.
CREATE TABLE IF NOT EXISTS billing_plans (
  id SERIAL PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,                    -- 'pro_monthly', 'enterprise_annual', etc.
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  plan_tier VARCHAR(30) NOT NULL,                     -- 'free', 'pro', 'team', 'enterprise' (matches organizations.subscription_plan)
  stripe_price_id VARCHAR(100) UNIQUE,                -- Stripe Price ID (e.g. 'price_1P...')
  stripe_product_id VARCHAR(100),
  billing_interval VARCHAR(20) DEFAULT 'month' CHECK (billing_interval IN ('month', 'year', 'one_time')),
  amount_cents INTEGER NOT NULL DEFAULT 0,            -- cached for UI display; Stripe is source of truth
  currency VARCHAR(10) DEFAULT 'usd',
  max_users INTEGER,                                   -- soft limit, NULL = unlimited
  max_projects INTEGER,                                -- soft limit
  features JSONB DEFAULT '[]',                         -- array of feature strings for the UI
  is_public BOOLEAN DEFAULT true,                      -- show on customer upgrade page?
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_billing_plans_public ON billing_plans(is_public, active, sort_order);


-- 3. subscriptions: one row per Stripe subscription
-- Multiple subscriptions per org are allowed (e.g. during plan switches)
-- but only one should be 'active' at a time per org.
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES billing_plans(id),
  stripe_subscription_id VARCHAR(64) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(64) NOT NULL,
  stripe_price_id VARCHAR(100),
  status VARCHAR(30) NOT NULL,                         -- 'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  quantity INTEGER DEFAULT 1,
  amount_cents INTEGER,                                 -- snapshotted from Stripe at event time
  currency VARCHAR(10) DEFAULT 'usd',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(stripe_customer_id);


-- 4. invoices: historical invoice/payment records
-- One row per Stripe Invoice. status transitions are immutable history —
-- we update, never delete, because accounting/audit may need the trail.
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id VARCHAR(64) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(64) NOT NULL,
  stripe_charge_id VARCHAR(64),
  stripe_payment_intent_id VARCHAR(64),
  number VARCHAR(50),                                   -- human-readable invoice number from Stripe
  status VARCHAR(30),                                   -- 'draft', 'open', 'paid', 'uncollectible', 'void'
  amount_due_cents INTEGER NOT NULL,
  amount_paid_cents INTEGER DEFAULT 0,
  amount_remaining_cents INTEGER DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'usd',
  invoice_date TIMESTAMPTZ,                             -- Stripe's created timestamp
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  attempt_count INTEGER DEFAULT 0,                      -- Stripe's retry count for failed charges
  last_failure_reason TEXT,                             -- captured from last failed attempt
  hosted_invoice_url TEXT,                              -- Stripe-hosted URL for admin lookup
  invoice_pdf_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_unpaid ON invoices(organization_id, status) WHERE status IN ('open', 'uncollectible');


-- 5. payment_events: webhook event log for idempotency + audit
-- Every Stripe webhook event gets recorded here. event_id is Stripe's
-- unique event identifier — we use it as the idempotency key so replayed
-- webhooks from network retries don't double-process.
CREATE TABLE IF NOT EXISTS payment_events (
  id SERIAL PRIMARY KEY,
  stripe_event_id VARCHAR(64) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,                     -- 'invoice.paid', 'customer.subscription.updated', etc.
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  payload JSONB,                                         -- full webhook payload
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_events_type ON payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_org ON payment_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_unprocessed ON payment_events(processed, received_at) WHERE processed = false;


-- 6. Seed a free/starter plan so the upgrade UI has something to show
-- out of the box. Stripe price IDs are NULL here — admin sets them
-- after creating prices in the Stripe Dashboard. is_public=false means
-- they won't show on the upgrade page until admin flips the flag.
INSERT INTO billing_plans (key, display_name, description, plan_tier, billing_interval, amount_cents, max_users, max_projects, features, is_public, sort_order)
VALUES
  ('free', 'Free', 'For evaluating LeadFlow. 1 inspector, 5 projects, watermarked reports.', 'free', 'month', 0, 1, 5,
   '["1 inspector", "5 projects", "Watermarked reports", "Community support"]', true, 0),
  ('pro_monthly', 'Pro (Monthly)', 'For independent inspectors and small teams.', 'pro', 'month', 9900, 3, NULL,
   '["Up to 3 inspectors", "Unlimited projects", "No watermark", "Voice notes + AI assist", "Email support"]', false, 10),
  ('pro_annual', 'Pro (Annual)', 'Annual billing, 2 months free.', 'pro', 'year', 99000, 3, NULL,
   '["Up to 3 inspectors", "Unlimited projects", "No watermark", "Voice notes + AI assist", "Priority email support", "2 months free vs monthly"]', false, 11),
  ('team_monthly', 'Team (Monthly)', 'For inspection companies managing multiple inspectors.', 'team', 'month', 29900, 10, NULL,
   '["Up to 10 inspectors", "Team management", "Client portal", "Custom branding", "Phone support"]', false, 20),
  ('enterprise_monthly', 'Enterprise', 'Custom plans for large inspection firms, government, and industrial.', 'enterprise', 'month', 0, NULL, NULL,
   '["Unlimited inspectors", "SSO (SAML)", "Dedicated account manager", "Custom integrations", "SLA", "Contact sales for pricing"]', true, 30)
ON CONFLICT (key) DO NOTHING;


-- 7. Comments for operators reading the schema later
COMMENT ON TABLE billing_plans IS 'Catalog of subscription plans. stripe_price_id links to Stripe Dashboard price.';
COMMENT ON TABLE subscriptions IS 'Stripe subscriptions. One active per org. Webhook-driven; do not modify directly.';
COMMENT ON TABLE invoices IS 'Invoice history. Never delete rows — audit trail for accounting.';
COMMENT ON TABLE payment_events IS 'Stripe webhook idempotency log. stripe_event_id UNIQUE prevents double-processing.';
COMMENT ON COLUMN organizations.stripe_customer_id IS 'NULL until org upgrades. Admin-typed monthly_rate stays authoritative when NULL.';
