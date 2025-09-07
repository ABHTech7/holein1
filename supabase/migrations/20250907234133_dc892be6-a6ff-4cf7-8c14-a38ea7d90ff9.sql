-- Update the function to expire legacy entries after 5 hours
CREATE OR REPLACE FUNCTION public.update_expired_entries()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated_count integer := 0;
  legacy_count integer := 0;
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
  
  -- Handle legacy entries without attempt windows (older than 5 hours)
  UPDATE public.entries 
  SET 
    outcome_self = 'auto_miss',
    outcome_reported_at = now(),
    status = 'expired',
    updated_at = now()
  WHERE 
    attempt_window_end IS NULL 
    AND entry_date < (now() - interval '5 hours')
    AND outcome_self IS NULL
    AND status = 'pending';
    
  GET DIAGNOSTICS legacy_count = ROW_COUNT;
  updated_count := updated_count + legacy_count;
  
  -- Log the update for monitoring
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
$function$;

-- Manually update expired entries older than 5 hours
-- This bypasses the trigger by updating without INSERT/UPDATE operations on new rows
UPDATE public.entries 
SET 
  outcome_self = 'auto_miss',
  outcome_reported_at = now(),
  status = 'expired'
WHERE 
  attempt_window_end IS NULL 
  AND entry_date < (now() - interval '5 hours')
  AND outcome_self IS NULL
  AND status = 'pending';