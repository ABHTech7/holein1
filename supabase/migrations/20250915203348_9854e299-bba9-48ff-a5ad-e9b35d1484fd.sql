-- Fix RLS for clubs: avoid restrictive ALL policies blocking SELECT
-- 1) Drop existing problematic ALL policies
DROP POLICY IF EXISTS "Admins have full access" ON public.clubs;
DROP POLICY IF EXISTS "Club members can manage their club" ON public.clubs;

-- 2) Ensure correct SELECT policies exist
DROP POLICY IF EXISTS admin_select_all_clubs ON public.clubs;
CREATE POLICY admin_select_all_clubs 
ON public.clubs 
FOR SELECT 
USING (get_current_user_role() = 'ADMIN'::user_role);

DROP POLICY IF EXISTS club_select_own ON public.clubs;
CREATE POLICY club_select_own 
ON public.clubs 
FOR SELECT 
USING (
  get_current_user_role() = 'CLUB'::user_role 
  AND id = get_current_user_club_id()
);

-- 3) Recreate modification policies without affecting SELECT
-- Admins can insert/update/delete
CREATE POLICY admin_insert_clubs
ON public.clubs
FOR INSERT
AS PERMISSIVE
TO authenticated
WITH CHECK (get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY admin_update_clubs
ON public.clubs
FOR UPDATE
AS PERMISSIVE
TO authenticated
USING (get_current_user_role() = 'ADMIN'::user_role)
WITH CHECK (get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY admin_delete_clubs
ON public.clubs
FOR DELETE
AS PERMISSIVE
TO authenticated
USING (get_current_user_role() = 'ADMIN'::user_role);

-- Club members can update their own club row
DROP POLICY IF EXISTS club_update_own ON public.clubs;
CREATE POLICY club_update_own
ON public.clubs
FOR UPDATE
AS PERMISSIVE
TO authenticated
USING (get_current_user_role() = 'CLUB'::user_role AND id = get_current_user_club_id())
WITH CHECK (get_current_user_role() = 'CLUB'::user_role AND id = get_current_user_club_id());