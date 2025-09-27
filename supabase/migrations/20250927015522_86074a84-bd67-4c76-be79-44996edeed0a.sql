-- Fix SUPER_ADMIN access to club banking
-- Step 1: Drop conflicting policies that are blocking SUPER_ADMIN
DROP POLICY IF EXISTS "Only club owners can insert their banking details" ON public.club_banking;
DROP POLICY IF EXISTS "Only club owners can update their banking details" ON public.club_banking;

-- Step 2: Update admin policy to use get_current_user_is_admin() which includes both ADMIN and SUPER_ADMIN
DROP POLICY IF EXISTS "club_banking_admin_all" ON public.club_banking;
CREATE POLICY "club_banking_admin_all" 
ON public.club_banking 
FOR ALL 
USING (get_current_user_is_admin()) 
WITH CHECK (get_current_user_is_admin());

-- Step 3: Keep the club policy as-is (already correct)
-- club_banking_club_rw policy remains unchanged