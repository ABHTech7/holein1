-- Secure magic_link_tokens table - restrict access to service_role only

-- Revoke all privileges from anon and authenticated roles
REVOKE ALL ON public.magic_link_tokens FROM anon;
REVOKE ALL ON public.magic_link_tokens FROM authenticated;

-- Enable Row Level Security
ALTER TABLE public.magic_link_tokens ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on magic_link_tokens
DO $$
DECLARE
  pol_name text;
BEGIN
  FOR pol_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'magic_link_tokens'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.magic_link_tokens;', pol_name);
  END LOOP;
END $$;

-- Add restrictive default deny policy
CREATE POLICY deny_all_magic_link_tokens
  ON public.magic_link_tokens
  AS RESTRICTIVE FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);