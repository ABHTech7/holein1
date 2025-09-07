-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to auto-update expired entries to missed status
CREATE OR REPLACE FUNCTION public.update_expired_entries()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  updated_count integer;
BEGIN
  -- Update all entries that have passed their attempt window and haven't reported an outcome
  UPDATE public.entries 
  SET 
    outcome_self = 'auto_miss',
    outcome_reported_at = now(),
    updated_at = now()
  WHERE 
    attempt_window_end IS NOT NULL 
    AND attempt_window_end < now()
    AND outcome_self IS NULL;
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log the update for monitoring (only if audit_events table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_events') THEN
    INSERT INTO public.audit_events (action, entity_type, entity_id, new_values, user_agent)
    VALUES (
      'auto_miss_expired_entries',
      'system',
      gen_random_uuid(),
      jsonb_build_object('updated_count', updated_count, 'timestamp', now()),
      'system_cron'
    );
  END IF;
  
  RETURN updated_count;
END;
$$;

-- Run it once now to clean up existing expired entries
SELECT public.update_expired_entries();