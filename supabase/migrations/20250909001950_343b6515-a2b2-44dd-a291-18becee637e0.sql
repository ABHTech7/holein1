-- Add RLS policy to allow club members to view profile information for players in their competitions
CREATE POLICY "Club members can view profiles of players in their competitions" 
ON public.profiles 
FOR SELECT 
USING (
  get_current_user_role() = 'CLUB'::user_role 
  AND EXISTS (
    SELECT 1 
    FROM public.entries e
    JOIN public.competitions c ON e.competition_id = c.id
    WHERE e.player_id = profiles.id 
    AND c.club_id = get_current_user_club_id()
  )
);