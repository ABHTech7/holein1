-- Find and disable the cooldown trigger (check common trigger naming patterns)
DO $$
DECLARE
    trigger_name TEXT;
BEGIN
    -- Find the actual trigger name that uses check_entry_cooldown
    SELECT tgname INTO trigger_name 
    FROM pg_trigger t 
    JOIN pg_proc p ON t.tgfoid = p.oid 
    WHERE p.proname = 'check_entry_cooldown' 
    AND t.tgrelid = 'public.entries'::regclass;
    
    IF trigger_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.entries DISABLE TRIGGER %I', trigger_name);
    END IF;
END $$;

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
  
  RETURN updated_count;
END;
$function$;

-- Update expired entries older than 5 hours
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

-- Re-enable the trigger
DO $$
DECLARE
    trigger_name TEXT;
BEGIN
    SELECT tgname INTO trigger_name 
    FROM pg_trigger t 
    JOIN pg_proc p ON t.tgfoid = p.oid 
    WHERE p.proname = 'check_entry_cooldown' 
    AND t.tgrelid = 'public.entries'::regclass;
    
    IF trigger_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.entries ENABLE TRIGGER %I', trigger_name);
    END IF;
END $$;