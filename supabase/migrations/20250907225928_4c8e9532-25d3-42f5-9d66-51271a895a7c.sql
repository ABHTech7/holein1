-- Fix clubs table RLS policies - remove duplicates and conflicts
-- Drop all existing policies first
DROP POLICY IF EXISTS "Admins can manage clubs" ON public.clubs;
DROP POLICY IF EXISTS "Admins can view archived clubs" ON public.clubs;
DROP POLICY IF EXISTS "Admins can view full club data" ON public.clubs;
DROP POLICY IF EXISTS "Club members can view their club" ON public.clubs;
DROP POLICY IF EXISTS "Club members can view their own full club data" ON public.clubs;
DROP POLICY IF EXISTS "Public can view basic club info" ON public.clubs;

-- Create simplified, non-conflicting policies
-- 1. Admins can do everything
CREATE POLICY "Admins have full access" 
ON public.clubs 
FOR ALL 
USING (get_current_user_role() = 'ADMIN'::user_role);

-- 2. Club members can view and update their own club data
CREATE POLICY "Club members can manage their club" 
ON public.clubs 
FOR ALL 
USING (
  id = get_current_user_club_id() 
  AND get_current_user_role() = 'CLUB'::user_role
);

-- 3. Authenticated users can view basic info of active clubs (name, website only)
CREATE POLICY "Authenticated users can view basic club info" 
ON public.clubs 
FOR SELECT 
USING (
  archived = false 
  AND active = true 
  AND auth.uid() IS NOT NULL
);

-- 4. Anonymous users can view basic info through the public view only
-- (This policy allows the view to work)
CREATE POLICY "Anonymous users can view active clubs for public view" 
ON public.clubs 
FOR SELECT 
USING (
  archived = false 
  AND active = true 
  AND auth.uid() IS NULL
);