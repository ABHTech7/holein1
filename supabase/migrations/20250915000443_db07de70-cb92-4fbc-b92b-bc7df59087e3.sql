-- Fix RLS policies for public.profiles (idempotent)

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on profiles to remove any recursive ones
DO $$
DECLARE
  pol_name text;
BEGIN
  FOR pol_name IN
    SELECT polname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles;', pol_name);
  END LOOP;
END $$;

-- Re-create minimal, safe, non-recursive policies

-- Allow each user to SELECT their own profile row
CREATE POLICY profiles_select_owner
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Allow each user to INSERT their own profile row
CREATE POLICY profiles_insert_owner
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Allow each user to UPDATE their own profile row
CREATE POLICY profiles_update_owner
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

/*
OPTIONAL: If we have an admin role in the JWT (e.g. claim "role":"admin"),
allow admins to SELECT all profiles. This avoids recursion by reading only the JWT.

To enable, set the JWT custom claim in your auth flow (not here).
If you do not use an admin claim, you may remove this block safely.
*/
CREATE POLICY profiles_select_admin
  ON public.profiles
  FOR SELECT
  USING (
    coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin'
  );