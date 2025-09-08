-- Enable leaked password protection for better security
-- This prevents users from using commonly leaked passwords
UPDATE auth.config
SET
  password_min_length = 8,
  weak_password_protection_enabled = true
WHERE
  id = 'auth_config';

-- If the config doesn't exist, insert it
INSERT INTO auth.config (id, password_min_length, weak_password_protection_enabled)
SELECT 'auth_config', 8, true
WHERE NOT EXISTS (SELECT 1 FROM auth.config WHERE id = 'auth_config');