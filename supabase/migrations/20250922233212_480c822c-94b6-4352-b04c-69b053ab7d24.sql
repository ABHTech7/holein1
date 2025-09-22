-- Create secure function to bulk mark unpaid entries as paid
CREATE OR REPLACE FUNCTION public.admin_mark_all_unpaid_entries_paid()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  -- Only admins can perform this action
  IF NOT public.get_current_user_is_admin() THEN
    RAISE EXCEPTION 'Access denied - admin required';
  END IF;

  UPDATE public.entries
  SET paid = true,
      payment_date = now(),
      updated_at = now()
  WHERE paid = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Create secure function to create verification records for all win entries
CREATE OR REPLACE FUNCTION public.create_verifications_for_wins()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  -- Only admins can perform this action
  IF NOT public.get_current_user_is_admin() THEN
    RAISE EXCEPTION 'Access denied - admin required';
  END IF;

  INSERT INTO public.verifications (entry_id, status, witnesses, evidence_captured_at, social_consent)
  SELECT e.id,
         'pending',
         '[]'::jsonb,
         COALESCE(e.outcome_reported_at, now()),
         false
  FROM public.entries e
  WHERE e.outcome_self = 'win'
    AND NOT EXISTS (
      SELECT 1 FROM public.verifications v WHERE v.entry_id = e.id
    );

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
EXCEPTION WHEN OTHERS THEN
  -- Do not block the caller; return 0 if anything goes wrong
  RETURN 0;
END;
$$;

-- Harden the notification trigger function to avoid failing on secret retrieval
CREATE OR REPLACE FUNCTION public.send_claim_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  service_role_key text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Try to fetch the service role key in a safe way; if unavailable, skip sending
    BEGIN
      SELECT decrypted_secret INTO service_role_key
      FROM vault.decrypted_secrets
      WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      service_role_key := NULL;
    END;

    IF service_role_key IS NULL THEN
      RETURN NEW; -- Skip without error
    END IF;

    PERFORM
      net.http_post(
        url := 'https://srnbylbbsdckkwatfqjg.supabase.co/functions/v1/send-claim-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'verificationId', NEW.id,
          'entryId', NEW.entry_id,
          'playerId', (SELECT player_id FROM entries WHERE id = NEW.entry_id),
          'competitionId', (SELECT competition_id FROM entries WHERE id = NEW.entry_id)
        )
      );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block inserts because of notification errors
  RETURN NEW;
END;
$$;

-- Ensure trigger is (re)attached to use the updated function
DROP TRIGGER IF EXISTS trigger_send_claim_notification ON public.verifications;
CREATE TRIGGER trigger_send_claim_notification
AFTER INSERT ON public.verifications
FOR EACH ROW
EXECUTE FUNCTION public.send_claim_notification_email();

-- Ensure updated_at trigger exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'verifications' AND t.tgname = 'update_verifications_updated_at'
  ) THEN
    CREATE TRIGGER update_verifications_updated_at
    BEFORE UPDATE ON public.verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;