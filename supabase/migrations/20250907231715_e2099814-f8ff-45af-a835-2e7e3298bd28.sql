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
  
  -- Log the update for monitoring
  INSERT INTO public.audit_events (action, entity_type, entity_id, new_values, user_agent)
  VALUES (
    'auto_miss_expired_entries',
    'system',
    gen_random_uuid(),
    jsonb_build_object('updated_count', updated_count, 'timestamp', now()),
    'system_cron'
  );
  
  RETURN updated_count;
END;
$$;

-- Set up a cron job to run this function every 5 minutes
SELECT cron.schedule(
  'auto-miss-expired-entries',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT public.update_expired_entries();
  $$
);

-- Run it once now to clean up existing expired entries
SELECT public.update_expired_entries();