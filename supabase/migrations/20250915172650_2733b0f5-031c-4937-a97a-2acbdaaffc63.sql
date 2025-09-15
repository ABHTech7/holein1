-- Fix RLS policies to allow Admins and Clubs to access profiles properly

-- Add policy for Admins to view all profiles
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles
FOR SELECT USING (get_current_user_role() = 'ADMIN'::user_role);

-- Add policy for Club users to view profiles of players who entered their competitions
CREATE POLICY "clubs_can_view_competition_player_profiles" ON public.profiles
FOR SELECT USING (
  get_current_user_role() = 'CLUB'::user_role 
  AND EXISTS (
    SELECT 1 FROM entries e
    JOIN competitions c ON e.competition_id = c.id
    WHERE e.player_id = profiles.id
    AND c.club_id = get_current_user_club_id()
  )
);

-- Add performance index to optimize the Club profile access policy
CREATE INDEX IF NOT EXISTS idx_entries_player_competition 
ON entries(player_id, competition_id);