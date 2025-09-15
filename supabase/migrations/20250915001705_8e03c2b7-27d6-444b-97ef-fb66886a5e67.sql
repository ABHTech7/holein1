-- Fix profiles table RLS policies to prevent infinite recursion
-- Drop existing policies that may cause recursion and create safe ones

BEGIN;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies that may cause recursion
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END$$;

-- Create non-recursive policies using auth.uid() directly
-- SELECT: user can read only their own row
CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- INSERT: user can insert only their own row 
CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- UPDATE: user can update only their own row
CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- DELETE: disallow for non-admins (admins can use service_role)
CREATE POLICY profiles_delete_block
ON public.profiles
FOR DELETE
TO authenticated
USING (false);

COMMIT;