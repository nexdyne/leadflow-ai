-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Project metadata
  project_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Denormalized fields for quick listing/search
  property_address VARCHAR(255),
  city VARCHAR(100),
  state_code CHAR(2),
  zip VARCHAR(10),
  year_built INTEGER,
  inspection_date DATE,
  inspection_type VARCHAR(50),
  program_type VARCHAR(50),

  -- Complete app state (everything except photos which are stored separately)
  state_data JSONB NOT NULL,

  -- Status
  is_draft BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_address ON projects(property_address);
