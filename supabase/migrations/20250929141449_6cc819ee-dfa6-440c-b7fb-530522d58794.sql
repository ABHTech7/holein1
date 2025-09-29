-- Create missing verification records for existing win entries
INSERT INTO public.verifications (entry_id, status, witnesses, evidence_captured_at, social_consent)
SELECT e.id,
       'pending'::text,
       '[]'::jsonb,
       COALESCE(e.outcome_reported_at, now()),
       false
FROM public.entries e
WHERE e.outcome_self = 'win'
  AND NOT EXISTS (
    SELECT 1 FROM public.verifications v WHERE v.entry_id = e.id
  );