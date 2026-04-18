-- ═══════════════════════════════════════════════════════════
-- Organizations table: the subscribing company entity
-- Every user and team belongs to exactly one organization.
-- The Primary Admin is the decision-maker of the org.
-- ═══════════════════════════════════════════════════════════

-- 1) Create the organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  address TEXT,
  city VARCHAR(100),
  state_code VARCHAR(10),
  zip VARCHAR(20),
  phone VARCHAR(50),
  email VARCHAR(255),
  created_by INTEGER REFERENCES users(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2) Add organization_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

-- 3) Add organization_id to teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

-- 4) Backfill: create an organization from the Primary Admin's company_name
-- and link all existing users + teams to it
DO $$
DECLARE
  admin_record RECORD;
  org_id INTEGER;
BEGIN
  -- Find the primary admin
  SELECT id, company_name, email
  INTO admin_record
  FROM users
  WHERE is_primary_admin = true
  LIMIT 1;

  IF admin_record IS NOT NULL THEN
    -- Create the organization from the admin's company name
    INSERT INTO organizations (name, slug, email, created_by)
    VALUES (
      COALESCE(admin_record.company_name, 'My Company'),
      LOWER(REGEXP_REPLACE(COALESCE(admin_record.company_name, 'my-company'), '[^a-zA-Z0-9]+', '-', 'g')),
      admin_record.email,
      admin_record.id
    )
    RETURNING id INTO org_id;

    -- Link ALL existing users to this organization
    UPDATE users SET organization_id = org_id WHERE organization_id IS NULL;

    -- Link ALL existing teams to this organization
    UPDATE teams SET organization_id = org_id WHERE organization_id IS NULL;
  END IF;
END $$;
