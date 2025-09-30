-- Drop and recreate get_entry_for_current_email RPC to include auto_miss_at and null protection
-- This ensures all timing fields are returned and only valid entries with windows are shown

DROP FUNCTION IF EXISTS public.get_entry_for_current_email(uuid);

CREATE OR REPLACE FUNCTION public.get_entry_for_current_email(p_entry_id uuid)
RETURNS TABLE(
  id uuid,
  attempt_window_start timestamp with time zone,
  attempt_window_end timestamp with time zone,
  auto_miss_at timestamp with time zone,
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

  -- Return entry matching the authenticated user's email OR player_id (fallback)
  -- Only return entries with valid attempt windows
  RETURN QUERY
  SELECT 
    e.id,
    e.attempt_window_start,
    e.attempt_window_end,
    e.auto_miss_at,
    e.status,
    e.outcome_self,
    c.name as competition_name,
    c.hole_number,
    cl.name as club_name
  FROM public.entries e
  JOIN public.competitions c ON e.competition_id = c.id
  JOIN public.clubs cl ON c.club_id = cl.id
  WHERE e.id = p_entry_id 
    AND e.attempt_window_end IS NOT NULL  -- Only valid entries with attempt windows
    AND (
      lower(trim(e.email)) = v_email  -- Match by email (new entries)
      OR e.player_id = auth.uid()      -- Fallback: match by player_id (historical entries)
    )
  LIMIT 1;
END;
$function$;