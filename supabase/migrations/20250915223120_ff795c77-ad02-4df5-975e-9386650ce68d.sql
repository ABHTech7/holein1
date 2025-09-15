-- Fix the RLS probe profile query issue
-- The issue is that when auth.uid() is null, the query should return no rows
-- but it's currently returning multiple rows, causing .single() to fail

-- First, let's check existing policies for profiles table
-- The current policies should only allow users to see their own profile
-- But there might be an issue with null auth.uid() handling

-- Update the profiles RLS policy to be more explicit about null auth.uid()
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

CREATE POLICY "profiles_select_own" 
ON public.profiles 
FOR SELECT 
USING (
  -- Only allow selecting own profile, and only if authenticated
  auth.uid() IS NOT NULL AND id = auth.uid()
);

-- Also ensure admin policy is working correctly
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;

CREATE POLICY "admins_can_view_all_profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- Admins can view all profiles, but only if authenticated
  auth.uid() IS NOT NULL AND get_current_user_role() = 'ADMIN'::user_role
);

-- Check that clubs table admin policy is working
-- The error logs suggest permission denied issues
DROP POLICY IF EXISTS "admin_select_all_clubs" ON public.clubs;

CREATE POLICY "admin_select_all_clubs" 
ON public.clubs 
FOR SELECT 
USING (
  -- Ensure auth.uid() is not null for admin access
  auth.uid() IS NOT NULL AND get_current_user_role() = 'ADMIN'::user_role
);