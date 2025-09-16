-- Fix 42501 denials: convert SELECT policies to PERMISSIVE and split ALL policies to exclude SELECT
-- This migration keeps access scope the same but fixes policy composition

-- ========== CLUBS ==========
-- Drop restrictive SELECT policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS admin_select_all_clubs ON public.clubs;
DROP POLICY IF EXISTS club_select_own ON public.clubs;

CREATE POLICY admin_select_all_clubs
ON public.clubs
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY club_select_own
ON public.clubs
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  (get_current_user_role() = 'CLUB'::user_role)
  AND (id = get_current_user_club_id())
);

-- ========== COMPETITIONS ==========
-- Replace ALL policies with granular ones (so SELECT is not restricted)
DROP POLICY IF EXISTS "Admins can manage all competitions" ON public.competitions;
DROP POLICY IF EXISTS "Club members can manage their competitions" ON public.competitions;

-- Drop existing SELECT policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can view archived competitions" ON public.competitions;
DROP POLICY IF EXISTS "Authenticated users can view competitions" ON public.competitions;
DROP POLICY IF EXISTS admin_select_all_competitions ON public.competitions;

-- PERMISSIVE SELECT policies
CREATE POLICY admin_select_competitions
ON public.competitions
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY club_select_competitions
ON public.competitions
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  (get_current_user_role() = 'CLUB'::user_role)
  AND (club_id = get_current_user_club_id())
);

CREATE POLICY auth_users_view_non_archived_competitions
ON public.competitions
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (archived = false);

-- Non-SELECT policies that replace the former ALL policies
-- Admin manage (no SELECT)
CREATE POLICY admin_insert_competitions
ON public.competitions
FOR INSERT
TO authenticated
WITH CHECK (get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY admin_update_competitions
ON public.competitions
FOR UPDATE
TO authenticated
USING (get_current_user_role() = 'ADMIN'::user_role)
WITH CHECK (get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY admin_delete_competitions
ON public.competitions
FOR DELETE
TO authenticated
USING (get_current_user_role() = 'ADMIN'::user_role);

-- Club manage own (no SELECT)
CREATE POLICY club_insert_own_competitions
ON public.competitions
FOR INSERT
TO authenticated
WITH CHECK (
  (get_current_user_role() = 'CLUB'::user_role)
  AND (club_id = get_current_user_club_id())
);

CREATE POLICY club_update_own_competitions
ON public.competitions
FOR UPDATE
TO authenticated
USING (
  (get_current_user_role() = 'CLUB'::user_role)
  AND (club_id = get_current_user_club_id())
)
WITH CHECK (
  (get_current_user_role() = 'CLUB'::user_role)
  AND (club_id = get_current_user_club_id())
);

CREATE POLICY club_delete_own_competitions
ON public.competitions
FOR DELETE
TO authenticated
USING (
  (get_current_user_role() = 'CLUB'::user_role)
  AND (club_id = get_current_user_club_id())
);

-- ========== ENTRIES ==========
-- Replace SELECT policies with PERMISSIVE ones; keep existing INSERT/UPDATE for players
DROP POLICY IF EXISTS "Admins can view all entries" ON public.entries;
DROP POLICY IF EXISTS admin_select_all_entries ON public.entries;
DROP POLICY IF EXISTS "Club members can view entries for their competitions" ON public.entries;
DROP POLICY IF EXISTS "Players can view their own entries" ON public.entries;

CREATE POLICY admin_select_entries
ON public.entries
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY club_select_entries
ON public.entries
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  (get_current_user_role() = 'CLUB'::user_role)
  AND EXISTS (
    SELECT 1 FROM public.competitions c
    WHERE c.id = entries.competition_id
      AND c.club_id = get_current_user_club_id()
  )
);

CREATE POLICY player_select_own_entries
ON public.entries
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (player_id = auth.uid());

-- ========== VERIFICATIONS ==========
-- Replace SELECT policies with PERMISSIVE ones; keep existing non-SELECT policies
DROP POLICY IF EXISTS admin_select_all_verifications ON public.verifications;
DROP POLICY IF EXISTS verif_admin_select ON public.verifications;
DROP POLICY IF EXISTS verif_club_select ON public.verifications;
DROP POLICY IF EXISTS verif_player_select ON public.verifications;

CREATE POLICY admin_select_verifications
ON public.verifications
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY club_select_verifications
ON public.verifications
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  (get_current_user_role() = 'CLUB'::user_role)
  AND EXISTS (
    SELECT 1
    FROM public.entries e
    JOIN public.competitions c ON c.id = e.competition_id
    WHERE e.id = verifications.entry_id
      AND c.club_id = get_current_user_club_id()
  )
);

CREATE POLICY player_select_verifications
ON public.verifications
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = verifications.entry_id
      AND e.player_id = auth.uid()
  )
);

-- ========== PROFILES ==========
-- Replace SELECT policies with PERMISSIVE ones
DROP POLICY IF EXISTS admin_select_all_profiles ON public.profiles;
DROP POLICY IF EXISTS admins_can_view_all_profiles ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS clubs_can_view_competition_player_profiles ON public.profiles;

CREATE POLICY admin_select_profiles
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY player_select_own_profile
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY club_select_competition_player_profiles
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  (get_current_user_role() = 'CLUB'::user_role)
  AND EXISTS (
    SELECT 1
    FROM public.entries e
    JOIN public.competitions c ON e.competition_id = c.id
    WHERE e.player_id = profiles.id
      AND c.club_id = get_current_user_club_id()
  )
);
