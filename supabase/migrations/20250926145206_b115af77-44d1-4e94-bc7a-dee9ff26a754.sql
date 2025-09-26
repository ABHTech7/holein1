-- Create secure RPC function for admin players with stats
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
  created_at timestamp with time zone,
  last_entry_date timestamp with time zone,
  total_entries bigint,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check admin access
  IF NOT get_current_user_is_admin() THEN
    RAISE EXCEPTION 'Access denied - admin required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.phone,
    p.created_at,
    e.last_entry_date,
    COALESCE(e.total_entries, 0) as total_entries,
    p.status
  FROM profiles p
  LEFT JOIN (
    SELECT 
      player_id,
      COUNT(*) as total_entries,
      MAX(entry_date) as last_entry_date
    FROM entries
    GROUP BY player_id
  ) e ON p.id = e.player_id
  WHERE p.role = 'PLAYER'
    AND p.status != 'deleted'
    AND (
      p_search IS NULL OR 
      p_search = '' OR
      LOWER(p.first_name || ' ' || p.last_name) LIKE LOWER('%' || p_search || '%') OR
      LOWER(p.email) LIKE LOWER('%' || p_search || '%')
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Create function to safely top up demo entries
CREATE OR REPLACE FUNCTION public.top_up_demo_entries(
  p_target_count integer DEFAULT 1322
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count integer;
  needed_entries integer;
  inserted_count integer := 0;
BEGIN
  -- Check admin access
  IF NOT get_current_user_is_admin() THEN
    RAISE EXCEPTION 'Access denied - admin required';
  END IF;

  -- Get current demo entry count
  SELECT COUNT(*) INTO current_count
  FROM entries
  WHERE is_demo_data = true;

  -- Calculate how many entries we need
  needed_entries := GREATEST(0, p_target_count - current_count);

  IF needed_entries > 0 THEN
    -- Insert demo entries up to target
    INSERT INTO entries (
      id,
      competition_id,
      player_id, 
      email,
      entry_date,
      paid,
      price_paid,
      status,
      outcome_self,
      is_demo_data,
      attempt_number,
      is_repeat_attempt
    )
    SELECT
      gen_random_uuid(),
      c.id,
      p.id,
      p.email,
      (NOW() - (random() * INTERVAL '90 days'))::timestamp with time zone,
      true,
      c.entry_fee,
      CASE 
        WHEN random() < 0.9 THEN 'completed'
        ELSE 'pending'
      END,
      CASE 
        WHEN random() < 0.05 THEN 'win'
        WHEN random() < 0.85 THEN 'miss'
        ELSE NULL
      END,
      true,
      1,
      false
    FROM competitions c
    CROSS JOIN (
      SELECT * FROM profiles 
      WHERE role = 'PLAYER' 
      AND is_demo_data = true
      ORDER BY random() 
    ) p
    WHERE c.archived = false
    AND c.is_demo_data = true
    AND random() < 0.6
    LIMIT needed_entries;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'current_count', current_count,
    'target_count', p_target_count,
    'needed_entries', needed_entries,
    'inserted_count', inserted_count,
    'new_total', current_count + inserted_count
  );
END;
$$;