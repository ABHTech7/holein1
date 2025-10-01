-- =========================================
-- Win Verification Storage & Infrastructure
-- =========================================

-- Create verifications storage bucket (private with signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verifications',
  'verifications',
  false, -- private bucket, use signed URLs
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf'];

-- RLS policies for verifications bucket
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Players can insert their own verification files'
  ) THEN
    CREATE POLICY "Players can insert their own verification files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'verifications' AND
      EXISTS (
        SELECT 1 FROM entries e
        WHERE e.id::text = (storage.foldername(name))[1]
          AND e.player_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Players can update their own verification files'
  ) THEN
    CREATE POLICY "Players can update their own verification files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'verifications' AND
      EXISTS (
        SELECT 1 FROM entries e
        WHERE e.id::text = (storage.foldername(name))[1]
          AND e.player_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Players and staff can read verification files'
  ) THEN
    CREATE POLICY "Players and staff can read verification files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'verifications' AND
      (
        -- Player can read their own
        EXISTS (
          SELECT 1 FROM entries e
          WHERE e.id::text = (storage.foldername(name))[1]
            AND e.player_id = auth.uid()
        )
        OR
        -- Admin/Staff can read all
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('SUPER_ADMIN', 'ADMIN', 'CLUB')
        )
      )
    );
  END IF;
END $$;

-- =========================================
-- Witness Confirmations Table
-- =========================================
CREATE TABLE IF NOT EXISTS witness_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES verifications(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '48 hours'),
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_witness_confirmations_verification_id ON witness_confirmations(verification_id);
CREATE INDEX IF NOT EXISTS idx_witness_confirmations_token ON witness_confirmations(token);
CREATE INDEX IF NOT EXISTS idx_witness_confirmations_expires_at ON witness_confirmations(expires_at);

-- RLS for witness_confirmations
ALTER TABLE witness_confirmations ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'witness_confirmations' 
    AND policyname = 'Admins can manage witness confirmations'
  ) THEN
    CREATE POLICY "Admins can manage witness confirmations"
    ON witness_confirmations FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
      )
    );
  END IF;
END $$;

-- =========================================
-- Add witness fields to verifications table
-- =========================================
ALTER TABLE verifications 
ADD COLUMN IF NOT EXISTS witness_name TEXT,
ADD COLUMN IF NOT EXISTS witness_email TEXT,
ADD COLUMN IF NOT EXISTS witness_phone TEXT,
ADD COLUMN IF NOT EXISTS witness_confirmed_at TIMESTAMPTZ;

-- =========================================
-- Create indexes for performance
-- =========================================
CREATE INDEX IF NOT EXISTS idx_verifications_entry_id ON verifications(entry_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status);
CREATE INDEX IF NOT EXISTS idx_entries_player_comp_created ON entries(player_id, competition_id, created_at DESC);

-- =========================================
-- Create or Upsert Verification RPC
-- =========================================
CREATE OR REPLACE FUNCTION create_or_upsert_verification(
  p_entry_id UUID,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verification_id UUID;
  v_result JSONB;
BEGIN
  -- Check if verification already exists
  SELECT id INTO v_verification_id
  FROM verifications
  WHERE entry_id = p_entry_id;

  IF v_verification_id IS NOT NULL THEN
    -- Update existing verification
    UPDATE verifications
    SET
      selfie_url = COALESCE(p_payload->>'selfie_url', selfie_url),
      id_document_url = COALESCE(p_payload->>'id_document_url', id_document_url),
      handicap_proof_url = COALESCE(p_payload->>'handicap_proof_url', handicap_proof_url),
      video_url = COALESCE(p_payload->>'video_url', video_url),
      witness_name = COALESCE(p_payload->>'witness_name', witness_name),
      witness_email = COALESCE(p_payload->>'witness_email', witness_email),
      witness_phone = COALESCE(p_payload->>'witness_phone', witness_phone),
      social_consent = COALESCE((p_payload->>'social_consent')::boolean, social_consent),
      status = COALESCE(p_payload->>'status', status),
      updated_at = now()
    WHERE id = v_verification_id;
  ELSE
    -- Create new verification
    INSERT INTO verifications (
      entry_id,
      selfie_url,
      id_document_url,
      handicap_proof_url,
      video_url,
      witness_name,
      witness_email,
      witness_phone,
      social_consent,
      status,
      evidence_captured_at,
      witnesses
    ) VALUES (
      p_entry_id,
      p_payload->>'selfie_url',
      p_payload->>'id_document_url',
      p_payload->>'handicap_proof_url',
      p_payload->>'video_url',
      p_payload->>'witness_name',
      p_payload->>'witness_email',
      p_payload->>'witness_phone',
      COALESCE((p_payload->>'social_consent')::boolean, false),
      COALESCE(p_payload->>'status', 'pending'),
      now(),
      '[]'::jsonb
    )
    RETURNING id INTO v_verification_id;
  END IF;

  -- Return structured response
  SELECT jsonb_build_object(
    'verification_id', v_verification_id,
    'evidence', jsonb_build_object(
      'selfie_url', selfie_url,
      'id_document_url', id_document_url,
      'handicap_proof_url', handicap_proof_url,
      'video_url', video_url
    ),
    'witness', jsonb_build_object(
      'name', witness_name,
      'email', witness_email,
      'phone', witness_phone,
      'confirmed_at', witness_confirmed_at
    )
  ) INTO v_result
  FROM verifications
  WHERE id = v_verification_id;

  RETURN v_result;
END;
$$;

-- =========================================
-- Update get_my_entries to include all required fields
-- =========================================
DROP FUNCTION IF EXISTS get_my_entries(INTEGER, INTEGER, JSONB);

CREATE FUNCTION get_my_entries(
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0,
  p_filters JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  id UUID,
  created_at TIMESTAMPTZ,
  competition_id UUID,
  competition_name TEXT,
  club_name TEXT,
  attempt_number INTEGER,
  outcome_self TEXT,
  price_paid NUMERIC,
  is_repeat_attempt BOOLEAN,
  entry_date TIMESTAMPTZ,
  status TEXT,
  entry_fee NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.created_at,
    e.competition_id,
    c.name AS competition_name,
    cl.name AS club_name,
    e.attempt_number,
    e.outcome_self,
    e.price_paid,
    e.is_repeat_attempt,
    e.entry_date,
    e.status,
    c.entry_fee
  FROM entries e
  JOIN competitions c ON c.id = e.competition_id
  JOIN clubs cl ON cl.id = c.club_id
  WHERE LOWER(e.email) = LOWER(auth.jwt() ->> 'email')
    AND (p_filters->>'outcome' IS NULL OR e.outcome_self = p_filters->>'outcome')
    AND (p_filters->>'club_id' IS NULL OR c.club_id::text = p_filters->>'club_id')
    AND (p_filters->>'from' IS NULL OR e.created_at >= (p_filters->>'from')::timestamptz)
    AND (p_filters->>'to' IS NULL OR e.created_at < (p_filters->>'to')::timestamptz)
    AND (
      p_filters->>'search' IS NULL OR
      c.name ILIKE CONCAT('%', p_filters->>'search', '%')
    )
  ORDER BY e.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;