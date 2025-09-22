-- Create verification record for Tiger's existing win
INSERT INTO public.verifications (
  entry_id,
  status,
  witnesses,
  evidence_captured_at,
  created_at,
  updated_at
) VALUES (
  'f327dcb5-f0dd-44fd-929d-082c9bff49fe',
  'initiated',
  '[]'::jsonb,
  now(),
  now(),
  now()
) ON CONFLICT (entry_id) DO NOTHING;

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
    ON CONFLICT (entry_id) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count FROM missing_verifications;
  
  RETURN inserted_count;
END;
$$;

-- Run the function to catch any existing wins without verification records
SELECT public.ensure_win_verification_records();