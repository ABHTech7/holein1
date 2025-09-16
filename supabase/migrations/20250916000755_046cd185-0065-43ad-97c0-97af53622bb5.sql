-- Fix RLS policies by making admin SELECT policies PERMISSIVE instead of RESTRICTIVE
-- This allows admin users to access data through complex joins without permission denied errors

-- Drop existing restrictive admin select policies
DROP POLICY IF EXISTS "admin_select_all_clubs" ON public.clubs;
DROP POLICY IF EXISTS "admin_select_all_competitions" ON public.competitions;  
DROP POLICY IF EXISTS "admin_select_all_entries" ON public.entries;
DROP POLICY IF EXISTS "admin_select_all_verifications" ON public.verifications;
DROP POLICY IF EXISTS "admin_select_all_profiles" ON public.profiles;

-- Recreate as PERMISSIVE policies (allows admin access even in complex joins)
CREATE POLICY "admin_select_all_clubs" ON public.clubs
FOR SELECT TO authenticated 
USING (get_current_user_role() = 'ADMIN'::user_role)
AS PERMISSIVE;

CREATE POLICY "admin_select_all_competitions" ON public.competitions  
FOR SELECT TO authenticated
USING (get_current_user_role() = 'ADMIN'::user_role)
AS PERMISSIVE;

CREATE POLICY "admin_select_all_entries" ON public.entries
FOR SELECT TO authenticated  
USING (get_current_user_role() = 'ADMIN'::user_role)
AS PERMISSIVE;

CREATE POLICY "admin_select_all_verifications" ON public.verifications
FOR SELECT TO authenticated
USING (get_current_user_role() = 'ADMIN'::user_role) 
AS PERMISSIVE;

CREATE POLICY "admin_select_all_profiles" ON public.profiles
FOR SELECT TO authenticated
USING (get_current_user_role() = 'ADMIN'::user_role)
AS PERMISSIVE;