-- Fix get_entry_for_current_email RPC: add pg_temp to search_path and grant execute

-- Drop and recreate with correct search_path
DROP FUNCTION IF EXISTS public.get_entry_for_current_email(uuid);

CREATE OR REPLACE FUNCTION public.get_entry_for_current_email(p_entry_id uuid)
RETURNS TABLE(
  id uuid,
  attempt_window_start timestamp with time zone,
  attempt_window_end timestamp with time zone,
  status text,
  outcome_self text,
  competition_name text,
  hole_number integer,
  club_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_email text;
BEGIN
  -- Get email from JWT
  v_email := lower(trim(auth.jwt() ->> 'email'));
  
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No authenticated email found';
  END IF;

  -- Return entry matching the authenticated user's email
  -- Use explicit column list and LIMIT 1 to guarantee single row shape
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
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_entry_for_current_email(uuid) TO authenticated;