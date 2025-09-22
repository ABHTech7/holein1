-- Fix security warnings by setting proper search path for the function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Enable real-time updates for leads and verifications tables
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.verifications REPLICA IDENTITY FULL;

-- Add tables to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.verifications;