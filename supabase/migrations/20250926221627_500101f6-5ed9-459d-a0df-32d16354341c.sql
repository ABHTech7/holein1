-- Update cleanup_demo_data function to handle audit_events foreign key constraint
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
  deleted_audit_events INTEGER := 0;
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

  -- Delete audit events for demo users first (foreign key dependency)
  RAISE NOTICE 'Deleting audit events...';
  WITH deleted AS (
    DELETE FROM public.audit_events a
    WHERE a.user_id IN (
      SELECT p.id FROM public.profiles p
      WHERE (p.is_demo_data = true OR 
             p.email LIKE '%@demo-golfer.test%' OR 
             p.email LIKE '%@holein1demo.test%' OR 
             p.email LIKE '%@holein1.test%')
      AND (cleanup_all OR p.created_at >= cutoff_time)
    )
    RETURNING a.id
  )
  SELECT COUNT(*) INTO deleted_audit_events FROM deleted;

  RAISE NOTICE 'Deleted % audit events', deleted_audit_events;

  -- Delete demo entries and related data (due to foreign keys)
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

  -- Delete demo profiles last (after removing foreign key dependencies)
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
    'deleted_audit_events', deleted_audit_events,
    'cleanup_mode', CASE WHEN cleanup_all THEN 'all' ELSE 'recent' END,
    'cutoff_time', cutoff_time,
    'execution_time_ms', execution_time_ms
  );
END;
$function$;