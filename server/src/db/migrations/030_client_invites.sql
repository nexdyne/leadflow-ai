-- C45: client share invites
-- When an inspector shares a project with a client email that does NOT yet
-- correspond to a registered user, we issue an invite token and email the
-- client a link to accept. The client lands on /invite/client/:token, sets
-- a password, and is auto-granted access to the project.
--
-- This table is the single source of truth for the pending-invite state.
-- Once the client accepts, the row is marked accepted_at and the
-- client_projects pivot is populated by the accept handler.

CREATE TABLE IF NOT EXISTS client_invites (
  id SERIAL PRIMARY KEY,

  -- Recipient
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),

  -- Who issued it and what they are sharing
  invited_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,

  -- Token and lifecycle
  token VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  accepted_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMP,

  -- Optional personal note from the inspector that gets included in the email
  message TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_invites_email ON client_invites(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_client_invites_token ON client_invites(token);
CREATE INDEX IF NOT EXISTS idx_client_invites_project ON client_invites(project_id);
CREATE INDEX IF NOT EXISTS idx_client_invites_pending
  ON client_invites(email, project_id)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
