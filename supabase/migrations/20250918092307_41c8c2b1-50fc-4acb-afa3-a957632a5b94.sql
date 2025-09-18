-- Drop existing unique constraint on profiles.email
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_unique;

-- Create partial unique index for active users only  
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_active_uidx
  ON public.profiles (lower(email))
  WHERE status = 'active';

COMMIT;