-- First drop the existing function so we can change its return type
DROP FUNCTION IF EXISTS public.get_admin_players_with_stats(integer, integer, text);

-- Create updated function that returns total count
CREATE OR REPLACE FUNCTION public.get_admin_players_with_stats(
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  email text,
  first_name text,
  last_name text,
  phone text,
  age_years integer,
  handicap numeric,
  gender text,
  club_name text,
  club_id uuid,
  role user_role,
  created_at timestamp with time zone,
  status text,
  entry_count bigint,
  last_entry_date timestamp with time zone,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_players bigint;
BEGIN
  -- Check if user is admin
  IF NOT get_current_user_is_admin() THEN
    RAISE EXCEPTION 'Access denied - admin required';
  END IF;

  -- Get total count first
  SELECT COUNT(*)
  INTO total_players
  FROM profiles p
  LEFT JOIN clubs c ON p.club_id = c.id
  WHERE p.role = 'PLAYER' 
    AND p.status != 'deleted' 
    AND p.deleted_at IS NULL
    AND (
      p_search IS NULL OR 
      p_search = '' OR
      LOWER(p.first_name || ' ' || COALESCE(p.last_name, '')) LIKE LOWER('%' || p_search || '%') OR
      LOWER(p.email) LIKE LOWER('%' || p_search || '%') OR
      LOWER(COALESCE(c.name, '')) LIKE LOWER('%' || p_search || '%')
    );

  -- Return paginated results with total count
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.phone,
    p.age_years,
    p.handicap,
    p.gender,
    c.name as club_name,
    p.club_id,
    p.role,
    p.created_at,
    p.status,
    COALESCE(entry_stats.entry_count, 0) as entry_count,
    entry_stats.last_entry_date,
    total_players as total_count
  FROM profiles p
  LEFT JOIN clubs c ON p.club_id = c.id
  LEFT JOIN (
    SELECT 
      e.player_id,
      COUNT(*) as entry_count,
      MAX(e.entry_date) as last_entry_date
    FROM entries e
    GROUP BY e.player_id
  ) entry_stats ON p.id = entry_stats.player_id
  WHERE p.role = 'PLAYER' 
    AND p.status != 'deleted' 
    AND p.deleted_at IS NULL
    AND (
      p_search IS NULL OR 
      p_search = '' OR
      LOWER(p.first_name || ' ' || COALESCE(p.last_name, '')) LIKE LOWER('%' || p_search || '%') OR
      LOWER(p.email) LIKE LOWER('%' || p_search || '%') OR
      LOWER(COALESCE(c.name, '')) LIKE LOWER('%' || p_search || '%')
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;