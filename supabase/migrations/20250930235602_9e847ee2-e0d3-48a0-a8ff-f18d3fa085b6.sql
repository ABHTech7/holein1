-- Update get_my_entries function to properly handle active vs history entries
-- Active = status = 'pending' AND outcome_self IS NULL AND now() < attempt_window_end

-- Create function to get only ACTIVE entries for current user
CREATE OR REPLACE FUNCTION public.get_my_active_entries()
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  competition_id uuid,
  competition_name text,
  club_name text,
  club_slug text,
  competition_slug text,
  attempt_number int,
  outcome_self text,
  price_paid numeric,
  is_repeat_attempt boolean,
  entry_date timestamptz,
  status text,
  attempt_window_end timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.created_at,
    e.competition_id,
    c.name as competition_name,
    cl.name as club_name,
    cl.slug as club_slug,
    c.slug as competition_slug,
    e.attempt_number,
    e.outcome_self,
    e.price_paid,
    e.is_repeat_attempt,
    e.entry_date,
    e.status,
    e.attempt_window_end
  FROM public.entries e
  JOIN public.competitions c ON c.id = e.competition_id
  JOIN public.clubs cl ON cl.id = c.club_id
  WHERE lower(e.email) = lower(auth.jwt() ->> 'email')
    AND e.status = 'pending'
    AND e.outcome_self IS NULL
    AND now() < e.attempt_window_end
  ORDER BY e.created_at DESC;
END;
$$;

-- Create function for admin to get active entries
CREATE OR REPLACE FUNCTION public.admin_get_active_entries(p_limit int DEFAULT 25, p_offset int DEFAULT 0)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  competition_id uuid,
  competition_name text,
  club_name text,
  player_id uuid,
  player_name text,
  player_email text,
  attempt_number int,
  outcome_self text,
  price_paid numeric,
  entry_date timestamptz,
  status text,
  attempt_window_end timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_active bigint;
BEGIN
  -- Check if user is admin
  IF NOT get_current_user_is_admin() THEN
    RAISE EXCEPTION 'Access denied - admin required';
  END IF;

  -- Get total active count
  SELECT COUNT(*)
  INTO total_active
  FROM public.entries e
  WHERE e.status = 'pending'
    AND e.outcome_self IS NULL
    AND now() < e.attempt_window_end;

  -- Return paginated results
  RETURN QUERY
  SELECT
    e.id,
    e.created_at,
    e.competition_id,
    c.name as competition_name,
    cl.name as club_name,
    e.player_id,
    COALESCE(p.first_name || ' ' || p.last_name, p.email) as player_name,
    p.email as player_email,
    e.attempt_number,
    e.outcome_self,
    e.price_paid,
    e.entry_date,
    e.status,
    e.attempt_window_end,
    total_active as total_count
  FROM public.entries e
  JOIN public.competitions c ON c.id = e.competition_id
  JOIN public.clubs cl ON cl.id = c.club_id
  JOIN public.profiles p ON p.id = e.player_id
  WHERE e.status = 'pending'
    AND e.outcome_self IS NULL
    AND now() < e.attempt_window_end
  ORDER BY e.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Add comment explaining Active entry definition
COMMENT ON FUNCTION public.get_my_active_entries IS 
'Returns only ACTIVE entries: status=pending, no outcome reported, and window not expired';

COMMENT ON FUNCTION public.admin_get_active_entries IS 
'Admin function to get ACTIVE entries: status=pending, no outcome reported, and window not expired';