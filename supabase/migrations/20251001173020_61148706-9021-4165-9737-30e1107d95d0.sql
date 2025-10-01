-- Create trigger to send claim confirmation email after verification insert
CREATE OR REPLACE FUNCTION public.trigger_claim_confirmation_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_role_key text;
  v_player_id uuid;
  v_competition_id uuid;
BEGIN
  -- Only trigger on INSERT
  IF TG_OP = 'INSERT' THEN
    -- Get player_id and competition_id from the entry
    SELECT e.player_id, e.competition_id
    INTO v_player_id, v_competition_id
    FROM entries e
    WHERE e.id = NEW.entry_id;

    -- Try to fetch service role key safely
    BEGIN
      SELECT decrypted_secret INTO v_service_role_key
      FROM vault.decrypted_secrets
      WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_service_role_key := NULL;
    END;

    -- Skip if service role key is not available (don't block the insert)
    IF v_service_role_key IS NULL THEN
      RETURN NEW;
    END IF;

    -- Call the edge function to send claim confirmation email
    PERFORM net.http_post(
      url := 'https://srnbylbbsdckkwatfqjg.supabase.co/functions/v1/send-claim-confirmation',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := jsonb_build_object(
        'verificationId', NEW.id,
        'entryId', NEW.entry_id,
        'playerId', v_player_id,
        'competitionId', v_competition_id
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block inserts because of notification errors
  RETURN NEW;
END;
$$;

-- Create trigger on verifications table
DROP TRIGGER IF EXISTS send_claim_confirmation_trigger ON public.verifications;
CREATE TRIGGER send_claim_confirmation_trigger
  AFTER INSERT ON public.verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_claim_confirmation_email();