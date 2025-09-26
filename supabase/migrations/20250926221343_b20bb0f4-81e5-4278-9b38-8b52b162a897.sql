-- Update cleanup_demo_data function to handle all demo email patterns and add progress logging
CREATE OR REPLACE FUNCTION public.cleanup_demo_data(cleanup_all boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_profiles INTEGER := 0;
  deleted_clubs INTEGER := 0;
  deleted_competitions INTEGER := 0;
  deleted_entries INTEGER := 0;
  cutoff_time TIMESTAMP WITH TIME ZONE;
  start_time TIMESTAMP WITH TIME ZONE;
  execution_time_ms INTEGER;
BEGIN
  start_time := clock_timestamp();
  
  -- Check admin access
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
  ) THEN
    RAISE EXCEPTION 'Access denied - admin required';
  END IF;

  -- Set cutoff time based on cleanup mode
  IF cleanup_all THEN
    cutoff_time := '1900-01-01'::timestamp with time zone; -- Everything
  ELSE  
    cutoff_time := now() - INTERVAL '3 hours'; -- Recent only
  END IF;

  RAISE NOTICE 'Starting demo data cleanup (mode: %, cutoff: %)', 
    CASE WHEN cleanup_all THEN 'all' ELSE 'recent' END, cutoff_time;

  -- Delete demo entries first (due to foreign keys)
  RAISE NOTICE 'Deleting verifications...';
  DELETE FROM public.verifications 
  WHERE entry_id IN (
    SELECT e.id FROM public.entries e
    JOIN public.profiles p ON e.player_id = p.id
    WHERE (p.is_demo_data = true OR 
           p.email LIKE '%@demo-golfer.test%' OR 
           p.email LIKE '%@holein1demo.test%' OR 
           p.email LIKE '%@holein1.test%')
    AND (cleanup_all OR e.created_at >= cutoff_time)
  );

  RAISE NOTICE 'Deleting claims...';
  DELETE FROM public.claims 
  WHERE entry_id IN (
    SELECT e.id FROM public.entries e  
    JOIN public.profiles p ON e.player_id = p.id
    WHERE (p.is_demo_data = true OR 
           p.email LIKE '%@demo-golfer.test%' OR 
           p.email LIKE '%@holein1demo.test%' OR 
           p.email LIKE '%@holein1.test%')
    AND (cleanup_all OR e.created_at >= cutoff_time)  
  );

  RAISE NOTICE 'Deleting entries...';
  WITH deleted AS (
    DELETE FROM public.entries e
    USING public.profiles p
    WHERE e.player_id = p.id 
    AND (p.is_demo_data = true OR 
         p.email LIKE '%@demo-golfer.test%' OR 
         p.email LIKE '%@holein1demo.test%' OR 
         p.email LIKE '%@holein1.test%')
    AND (cleanup_all OR e.created_at >= cutoff_time)
    RETURNING e.id
  )
  SELECT COUNT(*) INTO deleted_entries FROM deleted;

  RAISE NOTICE 'Deleted % entries', deleted_entries;

  -- Delete demo competitions
  RAISE NOTICE 'Deleting competitions...';
  WITH deleted AS (
    DELETE FROM public.competitions c
    WHERE (c.is_demo_data = true OR 
           c.name LIKE '%Demo%' OR 
           c.description LIKE '%demo%')
    AND (cleanup_all OR c.created_at >= cutoff_time)
    RETURNING c.id
  )  
  SELECT COUNT(*) INTO deleted_competitions FROM deleted;

  RAISE NOTICE 'Deleted % competitions', deleted_competitions;

  -- Delete demo clubs
  RAISE NOTICE 'Deleting clubs...';
  WITH deleted AS (
    DELETE FROM public.clubs c
    WHERE (c.is_demo_data = true OR 
           c.email LIKE '%@demo-golf-club.test%' OR 
           c.email LIKE '%@holein1demo.test%' OR 
           c.email LIKE '%demo%')
    AND (cleanup_all OR c.created_at >= cutoff_time)
    RETURNING c.id
  )
  SELECT COUNT(*) INTO deleted_clubs FROM deleted;

  RAISE NOTICE 'Deleted % clubs', deleted_clubs;

  -- Delete demo profiles last
  RAISE NOTICE 'Deleting profiles...';
  WITH deleted AS (
    DELETE FROM public.profiles p  
    WHERE (p.is_demo_data = true OR 
           p.email LIKE '%@demo-golfer.test%' OR 
           p.email LIKE '%@holein1demo.test%' OR 
           p.email LIKE '%@holein1.test%')
    AND (cleanup_all OR p.created_at >= cutoff_time)
    RETURNING p.id
  )
  SELECT COUNT(*) INTO deleted_profiles FROM deleted;

  RAISE NOTICE 'Deleted % profiles', deleted_profiles;

  -- Mark demo session as inactive
  UPDATE public.demo_data_sessions 
  SET is_active = false 
  WHERE is_active = true
  AND (cleanup_all OR created_at >= cutoff_time);

  execution_time_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;

  RAISE NOTICE 'Demo data cleanup completed in %ms', execution_time_ms;

  RETURN jsonb_build_object(
    'deleted_profiles', deleted_profiles,
    'deleted_clubs', deleted_clubs, 
    'deleted_competitions', deleted_competitions,
    'deleted_entries', deleted_entries,
    'cleanup_mode', CASE WHEN cleanup_all THEN 'all' ELSE 'recent' END,
    'cutoff_time', cutoff_time,
    'execution_time_ms', execution_time_ms
  );
END;
$function$;

-- Create function to backfill demo data flags
CREATE OR REPLACE FUNCTION public.backfill_demo_data_flags()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_profiles INTEGER := 0;
  updated_clubs INTEGER := 0;
  updated_competitions INTEGER := 0;
  updated_entries INTEGER := 0;
BEGIN
  -- Check admin access
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
  ) THEN
    RAISE EXCEPTION 'Access denied - admin required';
  END IF;

  -- Update profiles with demo email patterns
  WITH updated AS (
    UPDATE public.profiles 
    SET is_demo_data = true, updated_at = now()
    WHERE is_demo_data IS NOT true
    AND (email LIKE '%@demo-golfer.test%' OR 
         email LIKE '%@holein1demo.test%' OR 
         email LIKE '%@holein1.test%')
    RETURNING id
  )
  SELECT COUNT(*) INTO updated_profiles FROM updated;

  -- Update clubs with demo email patterns
  WITH updated AS (
    UPDATE public.clubs 
    SET is_demo_data = true, updated_at = now()
    WHERE is_demo_data IS NOT true
    AND (email LIKE '%@demo-golf-club.test%' OR 
         email LIKE '%@holein1demo.test%' OR 
         name LIKE '%Demo%')
    RETURNING id
  )
  SELECT COUNT(*) INTO updated_clubs FROM updated;

  -- Update competitions associated with demo clubs
  WITH updated AS (
    UPDATE public.competitions 
    SET is_demo_data = true, updated_at = now()
    WHERE is_demo_data IS NOT true
    AND club_id IN (
      SELECT id FROM public.clubs WHERE is_demo_data = true
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO updated_competitions FROM updated;

  -- Update entries from demo players
  WITH updated AS (
    UPDATE public.entries 
    SET is_demo_data = true, updated_at = now()
    WHERE is_demo_data IS NOT true
    AND player_id IN (
      SELECT id FROM public.profiles WHERE is_demo_data = true
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO updated_entries FROM updated;

  RETURN jsonb_build_object(
    'updated_profiles', updated_profiles,
    'updated_clubs', updated_clubs,
    'updated_competitions', updated_competitions,
    'updated_entries', updated_entries,
    'message', 'Demo data flags backfilled successfully'
  );
END;
$function$;

-- Update get_demo_data_stats to count both flagged and pattern-based demo data
CREATE OR REPLACE FUNCTION public.get_demo_data_stats()
RETURNS TABLE(
  demo_profiles bigint, 
  demo_clubs bigint, 
  demo_competitions bigint, 
  demo_entries bigint, 
  total_profiles bigint, 
  total_clubs bigint, 
  total_competitions bigint, 
  total_entries bigint, 
  latest_demo_session timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    (SELECT COUNT(*) FROM public.profiles 
     WHERE is_demo_data = true OR 
           email LIKE '%@demo-golfer.test%' OR 
           email LIKE '%@holein1demo.test%' OR 
           email LIKE '%@holein1.test%') AS demo_profiles,
    (SELECT COUNT(*) FROM public.clubs 
     WHERE is_demo_data = true OR 
           email LIKE '%@demo-golf-club.test%' OR 
           email LIKE '%@holein1demo.test%' OR 
           name LIKE '%Demo%') AS demo_clubs,
    (SELECT COUNT(*) FROM public.competitions 
     WHERE is_demo_data = true OR 
           club_id IN (SELECT id FROM public.clubs WHERE is_demo_data = true)) AS demo_competitions,
    (SELECT COUNT(*) FROM public.entries 
     WHERE is_demo_data = true OR 
           player_id IN (SELECT id FROM public.profiles 
                        WHERE is_demo_data = true OR 
                              email LIKE '%@demo-golfer.test%' OR 
                              email LIKE '%@holein1demo.test%' OR 
                              email LIKE '%@holein1.test%')) AS demo_entries,
    (SELECT COUNT(*) FROM public.profiles) AS total_profiles,
    (SELECT COUNT(*) FROM public.clubs) AS total_clubs,
    (SELECT COUNT(*) FROM public.competitions) AS total_competitions,
    (SELECT COUNT(*) FROM public.entries) AS total_entries,
    (SELECT MAX(created_at) FROM public.demo_data_sessions WHERE session_type = 'seed') AS latest_demo_session;
$function$;