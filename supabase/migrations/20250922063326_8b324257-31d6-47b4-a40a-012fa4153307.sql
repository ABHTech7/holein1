-- Create secure RPC function to update entry status bypassing RLS
CREATE OR REPLACE FUNCTION public.update_entry_outcome(
  p_entry_id UUID,
  p_outcome TEXT,
  p_video_url TEXT DEFAULT NULL
) 
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update entry with outcome and optional video evidence
  UPDATE public.entries 
  SET 
    outcome_self = p_outcome,
    outcome_reported_at = NOW(),
    status = CASE 
      WHEN p_outcome = 'win' THEN 'verification_pending'
      ELSE 'completed'
    END,
    video_evidence_url = p_video_url,
    updated_at = NOW()
  WHERE id = p_entry_id;
  
  -- Return true if update was successful
  RETURN FOUND;
END;
$$;

-- Add social media consent column to verifications table
ALTER TABLE public.verifications 
ADD COLUMN IF NOT EXISTS social_consent BOOLEAN DEFAULT FALSE;

-- Create trigger to send claim notification email when verification is created
CREATE OR REPLACE FUNCTION public.send_claim_notification_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_send_claim_notification ON public.verifications;
CREATE TRIGGER trigger_send_claim_notification
  AFTER INSERT ON public.verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_claim_notification_email();