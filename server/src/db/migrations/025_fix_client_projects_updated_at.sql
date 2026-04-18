-- Add missing updated_at column to client_projects table
-- The shareProject controller references ON CONFLICT ... SET updated_at = NOW()
-- but the original migration only created granted_at
ALTER TABLE client_projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
