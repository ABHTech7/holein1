-- Fix function search path security warnings

-- Update get_demo_data_stats function to set search_path  
CREATE OR REPLACE FUNCTION public.get_demo_data_stats()
RETURNS TABLE(
  demo_profiles BIGINT,
  demo_clubs BIGINT,  
  demo_competitions BIGINT,
  demo_entries BIGINT,
  total_profiles BIGINT,
  total_clubs BIGINT,
  total_competitions BIGINT,
  total_entries BIGINT,
  latest_demo_session TIMESTAMP WITH TIME ZONE
) LANGUAGE SQL STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT 
    (SELECT COUNT(*) FROM public.profiles WHERE is_demo_data = true) AS demo_profiles,
    (SELECT COUNT(*) FROM public.clubs WHERE is_demo_data = true) AS demo_clubs,
    (SELECT COUNT(*) FROM public.competitions WHERE is_demo_data = true) AS demo_competitions,
    (SELECT COUNT(*) FROM public.entries WHERE is_demo_data = true) AS demo_entries,
    (SELECT COUNT(*) FROM public.profiles) AS total_profiles,
    (SELECT COUNT(*) FROM public.clubs) AS total_clubs,
    (SELECT COUNT(*) FROM public.competitions) AS total_competitions,
    (SELECT COUNT(*) FROM public.entries) AS total_entries,
    (SELECT MAX(created_at) FROM public.demo_data_sessions WHERE session_type = 'seed') AS latest_demo_session;
$$;

-- Update cleanup_demo_data function to set search_path
CREATE OR REPLACE FUNCTION public.cleanup_demo_data(cleanup_all BOOLEAN DEFAULT false)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  deleted_profiles INTEGER := 0;
  deleted_clubs INTEGER := 0;
  deleted_competitions INTEGER := 0;
  deleted_entries INTEGER := 0;
  cutoff_time TIMESTAMP WITH TIME ZONE;
BEGIN
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

  -- Delete demo entries first (due to foreign keys)
  DELETE FROM public.verifications 
  WHERE entry_id IN (
    SELECT e.id FROM public.entries e
    JOIN public.profiles p ON e.player_id = p.id
    WHERE p.is_demo_data = true 
    AND (cleanup_all OR e.created_at >= cutoff_time)
  );

  DELETE FROM public.claims 
  WHERE entry_id IN (
    SELECT e.id FROM public.entries e  
    JOIN public.profiles p ON e.player_id = p.id
    WHERE p.is_demo_data = true
    AND (cleanup_all OR e.created_at >= cutoff_time)  
  );

  WITH deleted AS (
    DELETE FROM public.entries e
    USING public.profiles p
    WHERE e.player_id = p.id 
    AND p.is_demo_data = true
    AND (cleanup_all OR e.created_at >= cutoff_time)
    RETURNING e.id
  )
  SELECT COUNT(*) INTO deleted_entries FROM deleted;

  -- Delete demo competitions
  WITH deleted AS (
    DELETE FROM public.competitions c
    WHERE c.is_demo_data = true
    AND (cleanup_all OR c.created_at >= cutoff_time)
    RETURNING c.id
  )  
  SELECT COUNT(*) INTO deleted_competitions FROM deleted;

  -- Delete demo clubs
  WITH deleted AS (
    DELETE FROM public.clubs c
    WHERE c.is_demo_data = true
    AND (cleanup_all OR c.created_at >= cutoff_time)
    RETURNING c.id
  )
  SELECT COUNT(*) INTO deleted_clubs FROM deleted;

  -- Delete demo profiles last
  WITH deleted AS (
    DELETE FROM public.profiles p  
    WHERE p.is_demo_data = true
    AND (cleanup_all OR p.created_at >= cutoff_time)
    RETURNING p.id
  )
  SELECT COUNT(*) INTO deleted_profiles FROM deleted;

  -- Mark demo session as inactive
  UPDATE public.demo_data_sessions 
  SET is_active = false 
  WHERE is_active = true
  AND (cleanup_all OR created_at >= cutoff_time);

  RETURN jsonb_build_object(
    'deleted_profiles', deleted_profiles,
    'deleted_clubs', deleted_clubs, 
    'deleted_competitions', deleted_competitions,
    'deleted_entries', deleted_entries,
    'cleanup_mode', CASE WHEN cleanup_all THEN 'all' ELSE 'recent' END,
    'cutoff_time', cutoff_time
  );
END;
$$;