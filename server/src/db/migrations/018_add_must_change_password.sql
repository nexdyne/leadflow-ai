-- Add flag for admin-created users who need to change their temp password
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
