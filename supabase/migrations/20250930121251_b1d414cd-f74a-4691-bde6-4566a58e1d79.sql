-- Create secure RPC to get entry for current authenticated user's email
CREATE OR REPLACE FUNCTION public.get_entry_for_current_email(p_entry_id uuid)
RETURNS TABLE (
  id uuid,
  attempt_window_start timestamptz,
  attempt_window_end timestamptz,
  status text,
  outcome_self text,
  competition_name text,
  hole_number int,
  club_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- Get email from JWT
  v_email := lower(trim(auth.jwt() ->> 'email'));
  
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No authenticated email found';
  END IF;

  -- Return entry matching the authenticated user's email
  RETURN QUERY
  SELECT 
    e.id,
    e.attempt_window_start,
    e.attempt_window_end,
    e.status,
    e.outcome_self,
    c.name as competition_name,
    c.hole_number,
    cl.name as club_name
  FROM entries e
  INNER JOIN competitions c ON c.id = e.competition_id
  INNER JOIN clubs cl ON cl.id = c.club_id
  WHERE e.id = p_entry_id
    AND lower(trim(e.email)) = v_email
  LIMIT 1;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_entry_for_current_email(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_entry_for_current_email IS 'Securely fetches entry data for the current authenticated user by email match';