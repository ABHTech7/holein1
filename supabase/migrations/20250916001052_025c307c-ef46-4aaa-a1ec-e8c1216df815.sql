-- Add a permissive SELECT policy on clubs that explicitly allows ADMIN or the owning CLUB
-- This avoids join failures when PostgREST requires SELECT on clubs in nested selects
CREATE POLICY IF NOT EXISTS "clubs_admin_or_own_select"
ON public.clubs
FOR SELECT
TO public
USING (
  get_current_user_role() = 'ADMIN'::user_role
  OR (
    get_current_user_role() = 'CLUB'::user_role
    AND id = get_current_user_club_id()
  )
);
