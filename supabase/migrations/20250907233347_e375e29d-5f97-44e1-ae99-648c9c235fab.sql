-- Update the auto-miss function to also update status field
CREATE OR REPLACE FUNCTION public.update_expired_entries()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count integer;
BEGIN
  -- Update entries that have passed their attempt window and haven't reported an outcome
  UPDATE public.entries 
  SET 
    outcome_self = 'auto_miss',
    outcome_reported_at = now(),
    status = 'expired',
    updated_at = now()
  WHERE 
    attempt_window_end IS NOT NULL 
    AND attempt_window_end < now()
    AND outcome_self IS NULL;
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Handle legacy entries without attempt windows (older than 7 days)
  UPDATE public.entries 
  SET 
    outcome_self = 'auto_miss',
    outcome_reported_at = now(),
    status = 'expired',
    updated_at = now()
  WHERE 
    attempt_window_end IS NULL 
    AND entry_date < (now() - interval '7 days')
    AND outcome_self IS NULL
    AND status = 'pending';
    
  -- Add the legacy count to the total
  GET DIAGNOSTICS updated_count = updated_count + ROW_COUNT;
  
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

-- Fix the existing auto_miss entry that has wrong status
UPDATE public.entries 
SET status = 'expired' 
WHERE outcome_self = 'auto_miss' AND status = 'pending';

-- Run the updated function to process all entries
SELECT public.update_expired_entries() as entries_updated;