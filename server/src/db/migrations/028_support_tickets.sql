-- Migration 028: Support tickets + email notifications
--
-- Lets anyone (logged in or not) submit a support request from the public
-- landing page. Tickets are persisted here, admin triages them in the
-- platform dashboard, and each submission fires a notification email to
-- support@nexdynegroup.com (and an acknowledgement to the submitter).

CREATE TABLE IF NOT EXISTS support_tickets (
  id            SERIAL PRIMARY KEY,

  -- submitter
  name          VARCHAR(255),
  email         VARCHAR(255) NOT NULL,
  phone         VARCHAR(50),
  company       VARCHAR(255),
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- the ticket
  category      VARCHAR(32) NOT NULL DEFAULT 'general'
                CHECK (category IN ('general','bug','billing','feature','onboarding','account')),
  subject       VARCHAR(255) NOT NULL,
  message       TEXT NOT NULL,
  page_url      VARCHAR(500),        -- where they were when they submitted
  user_agent    VARCHAR(500),        -- browser/device hint
  ip_address    VARCHAR(45),

  -- triage
  status        VARCHAR(24) NOT NULL DEFAULT 'new'
                CHECK (status IN ('new','open','waiting','resolved','closed')),
  priority      VARCHAR(16) NOT NULL DEFAULT 'normal'
                CHECK (priority IN ('low','normal','high','urgent')),
  assigned_to   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  admin_notes   TEXT,                -- internal-only triage notes
  resolved_at   TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status     ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_email      ON support_tickets(email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created    ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned   ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority   ON support_tickets(priority);
