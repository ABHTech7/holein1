-- Comprehensive Admin SELECT Access Migration
-- Grant ADMIN users full SELECT access across all key admin dashboard tables

-- Clubs: Ensure standardized admin SELECT policy
DROP POLICY IF EXISTS admin_select_all_clubs ON public.clubs;
CREATE POLICY admin_select_all_clubs
ON public.clubs
FOR SELECT
TO authenticated
USING ( get_current_user_role() = 'ADMIN' );

-- Competitions: Replace broad ALL policy with specific SELECT policy
DROP POLICY IF EXISTS admin_select_all_competitions ON public.competitions;
CREATE POLICY admin_select_all_competitions
ON public.competitions
FOR SELECT
TO authenticated
USING ( get_current_user_role() = 'ADMIN' );

-- Entries: Update to use authenticated role
DROP POLICY IF EXISTS admin_select_all_entries ON public.entries;
CREATE POLICY admin_select_all_entries
ON public.entries
FOR SELECT
TO authenticated
USING ( get_current_user_role() = 'ADMIN' );

-- Verifications (Claims): Update to use authenticated role
DROP POLICY IF EXISTS admin_select_all_verifications ON public.verifications;
CREATE POLICY admin_select_all_verifications
ON public.verifications
FOR SELECT
TO authenticated
USING ( get_current_user_role() = 'ADMIN' );

-- Profiles: Update to use authenticated role with clean condition
DROP POLICY IF EXISTS admin_select_all_profiles ON public.profiles;
CREATE POLICY admin_select_all_profiles
ON public.profiles
FOR SELECT
TO authenticated
USING ( get_current_user_role() = 'ADMIN' );