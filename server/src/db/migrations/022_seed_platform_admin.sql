-- Migration 022: Seed platform admin account
-- Sets seyakerdavid@gmail.com as a platform admin
-- If the account doesn't exist yet, it will be flagged when they register/login
-- If it does exist, update it

UPDATE users SET is_platform_admin = true WHERE email = 'seyakerdavid@gmail.com';

-- Also ensure the platform admin route ordering fix for announcements
-- The /announcements/active route must come before /announcements/:id
-- (this is handled in code, not in DB, but this comment documents it)
