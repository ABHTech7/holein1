-- Move citext extension from public to extensions schema (security best practice)
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO public;

-- Drop from public if exists
DROP EXTENSION IF EXISTS citext CASCADE;

-- Install in extensions schema
CREATE EXTENSION IF NOT EXISTS citext SCHEMA extensions;

-- Update the generated column to use the extensions schema
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS email_norm;

ALTER TABLE public.profiles
ADD COLUMN email_norm extensions.citext 
  GENERATED ALWAYS AS (NULLIF(TRIM(LOWER(email)), '')) STORED;

-- Recreate the unique index
DROP INDEX IF EXISTS public.uidx_profiles_club_email_norm;

CREATE UNIQUE INDEX uidx_profiles_club_email_norm
ON public.profiles (club_id, email_norm)
WHERE email_norm IS NOT NULL 
  AND role = 'PLAYER' 
  AND deleted_at IS NULL 
  AND status != 'deleted';