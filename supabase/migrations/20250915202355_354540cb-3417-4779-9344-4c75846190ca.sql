-- Add specific SELECT policies for clubs table to allow club users to read their own club row
-- This fixes "permission denied for table clubs" errors

-- Admin users can read all clubs
DROP POLICY IF EXISTS admin_select_all_clubs ON public.clubs;
CREATE POLICY admin_select_all_clubs 
ON public.clubs 
FOR SELECT 
USING (get_current_user_role() = 'ADMIN'::user_role);

-- Club users can read ONLY their own club row
DROP POLICY IF EXISTS club_select_own ON public.clubs;
CREATE POLICY club_select_own 
ON public.clubs 
FOR SELECT 
USING (
  get_current_user_role() = 'CLUB'::user_role 
  AND id = get_current_user_club_id()
);