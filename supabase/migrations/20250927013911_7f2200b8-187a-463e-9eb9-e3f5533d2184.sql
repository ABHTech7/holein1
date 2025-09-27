-- Phase 2: Activate club and create test users
-- Activate Bramhall Golf Club
UPDATE public.clubs 
SET 
  active = true,
  updated_at = now()
WHERE name = 'Bramhall Golf Club';

-- Ensure admin user exists and is properly configured
INSERT INTO public.profiles (
  id, 
  email, 
  first_name, 
  last_name, 
  role,
  status
) VALUES (
  '5f566746-248c-4040-9e2c-23fc6228ce14',
  'admin@holein1.test',
  'Admin',
  'User',
  'SUPER_ADMIN',
  'active'
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = now();