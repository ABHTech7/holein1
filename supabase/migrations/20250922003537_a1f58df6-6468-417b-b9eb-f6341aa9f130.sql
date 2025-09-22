-- Create verification record for Tiger's existing win (without ON CONFLICT)
INSERT INTO public.verifications (
  entry_id,
  status,
  witnesses,
  evidence_captured_at,
  created_at,
  updated_at
) 
SELECT 
  'f327dcb5-f0dd-44fd-929d-082c9bff49fe',
  'initiated',
  '[]'::jsonb,
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.verifications 
  WHERE entry_id = 'f327dcb5-f0dd-44fd-929d-082c9bff49fe'
);

-- Create function to ensure all wins have verification records
CREATE OR REPLACE FUNCTION public.ensure_win_verification_records()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  -- Insert verification records for any wins that don't have them
  WITH missing_verifications AS (
    INSERT INTO public.verifications (
      entry_id,
      status,
      witnesses,
      evidence_captured_at,
      created_at,
      updated_at
    )
    SELECT 
      e.id,
      'initiated',
      '[]'::jsonb,
      e.outcome_reported_at,
      now(),
      now()
    FROM public.entries e
    WHERE e.outcome_self = 'win'
      AND NOT EXISTS (
        SELECT 1 FROM public.verifications v 
        WHERE v.entry_id = e.id
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count FROM missing_verifications;
  
  RETURN inserted_count;
END;
$$;