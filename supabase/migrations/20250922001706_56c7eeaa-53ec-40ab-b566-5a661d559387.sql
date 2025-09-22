-- Create database function to automatically send claim notification emails
CREATE OR REPLACE FUNCTION public.send_claim_notification_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send notification for newly created verifications
  IF TG_OP = 'INSERT' THEN
    -- Call the edge function to send email notification
    PERFORM
      net.http_post(
        url := 'https://srnbylbbsdckkwatfqjg.supabase.co/functions/v1/send-claim-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || 
          (SELECT value FROM vault.secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY') || '"}'::jsonb,
        body := json_build_object(
          'verificationId', NEW.id,
          'entryId', NEW.entry_id,
          'playerId', (SELECT player_id FROM entries WHERE id = NEW.entry_id),
          'competitionId', (SELECT competition_id FROM entries WHERE id = NEW.entry_id)
        )::jsonb
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically send email notifications for new claims
DROP TRIGGER IF EXISTS trigger_send_claim_notification ON public.verifications;
CREATE TRIGGER trigger_send_claim_notification
  AFTER INSERT ON public.verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_claim_notification_email();