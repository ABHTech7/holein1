-- Enable case-insensitive text extension
CREATE EXTENSION IF NOT EXISTS citext;

-- Add generated columns for normalized values on profiles table
-- These don't require client changes and work transparently
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_norm citext 
  GENERATED ALWAYS AS (NULLIF(TRIM(LOWER(email)), '')) STORED,
ADD COLUMN IF NOT EXISTS phone_norm text 
  GENERATED ALWAYS AS (
    CASE
      WHEN phone IS NULL OR btrim(phone) = '' THEN NULL
      ELSE regexp_replace(phone, '[^0-9+]', '', 'g')
    END
  ) STORED;

-- Add idempotency key for API double-submit protection
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS idempotency_key uuid;

-- Create unique indexes for club-scoped player uniqueness
-- Email uniqueness per club (case-insensitive, excludes soft-deleted)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_profiles_club_email_norm
ON public.profiles (club_id, email_norm)
WHERE email_norm IS NOT NULL 
  AND role = 'PLAYER' 
  AND deleted_at IS NULL 
  AND status != 'deleted';

-- Phone uniqueness per club (normalized, excludes soft-deleted)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_profiles_club_phone_norm
ON public.profiles (club_id, phone_norm)
WHERE phone_norm IS NOT NULL 
  AND role = 'PLAYER' 
  AND deleted_at IS NULL 
  AND status != 'deleted';

-- Idempotency key uniqueness (for create operations)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_profiles_idempotency_key
ON public.profiles (idempotency_key)
WHERE idempotency_key IS NOT NULL 
  AND role = 'PLAYER';

-- Create idempotent player creation function
CREATE OR REPLACE FUNCTION public.create_player_idempotent(
  p_club_id uuid,
  p_email text,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_phone_e164 text DEFAULT NULL,
  p_idempotency_key uuid DEFAULT NULL,
  p_age_years integer DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_handicap numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_player_id uuid;
  v_existing_player record;
  v_normalized_email citext;
  v_normalized_phone text;
BEGIN
  -- Normalize inputs for comparison
  v_normalized_email := NULLIF(TRIM(LOWER(p_email)), '');
  v_normalized_phone := CASE
    WHEN p_phone IS NULL OR btrim(p_phone) = '' THEN NULL
    ELSE regexp_replace(p_phone, '[^0-9+]', '', 'g')
  END;

  -- Check for existing player by idempotency key first (fastest path)
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_player_id
    FROM profiles
    WHERE idempotency_key = p_idempotency_key
      AND role = 'PLAYER'
      AND deleted_at IS NULL
      AND status != 'deleted'
    LIMIT 1;
    
    IF v_player_id IS NOT NULL THEN
      SELECT jsonb_build_object(
        'id', id,
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'phone', phone,
        'club_id', club_id,
        'created', false,
        'reason', 'idempotency_key_match'
      ) INTO v_existing_player
      FROM profiles
      WHERE id = v_player_id;
      
      RETURN v_existing_player;
    END IF;
  END IF;

  -- Check for existing player by club + email or phone
  IF p_club_id IS NOT NULL THEN
    SELECT id INTO v_player_id
    FROM profiles
    WHERE role = 'PLAYER'
      AND club_id = p_club_id
      AND deleted_at IS NULL
      AND status != 'deleted'
      AND (
        (v_normalized_email IS NOT NULL AND email_norm = v_normalized_email)
        OR
        (v_normalized_phone IS NOT NULL AND phone_norm = v_normalized_phone)
      )
    LIMIT 1;
    
    IF v_player_id IS NOT NULL THEN
      SELECT jsonb_build_object(
        'id', id,
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'phone', phone,
        'club_id', club_id,
        'created', false,
        'reason', 'duplicate_email_or_phone'
      ) INTO v_existing_player
      FROM profiles
      WHERE id = v_player_id;
      
      RETURN v_existing_player;
    END IF;
  END IF;

  -- No duplicate found, create new player
  BEGIN
    INSERT INTO profiles (
      id,
      email,
      first_name,
      last_name,
      phone,
      phone_e164,
      role,
      club_id,
      idempotency_key,
      age_years,
      gender,
      handicap,
      status,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      p_email,
      p_first_name,
      p_last_name,
      p_phone,
      p_phone_e164,
      'PLAYER',
      p_club_id,
      p_idempotency_key,
      p_age_years,
      p_gender,
      p_handicap,
      'active',
      now(),
      now()
    )
    RETURNING id INTO v_player_id;

    -- Return the newly created player
    SELECT jsonb_build_object(
      'id', id,
      'email', email,
      'first_name', first_name,
      'last_name', last_name,
      'phone', phone,
      'club_id', club_id,
      'created', true,
      'reason', 'new_player'
    ) INTO v_existing_player
    FROM profiles
    WHERE id = v_player_id;
    
    RETURN v_existing_player;
    
  EXCEPTION 
    WHEN unique_violation THEN
      -- Race condition: another transaction created the same player
      -- Re-fetch and return the existing record
      SELECT id INTO v_player_id
      FROM profiles
      WHERE role = 'PLAYER'
        AND deleted_at IS NULL
        AND status != 'deleted'
        AND (
          (p_idempotency_key IS NOT NULL AND idempotency_key = p_idempotency_key)
          OR
          (p_club_id IS NOT NULL AND club_id = p_club_id AND (
            (v_normalized_email IS NOT NULL AND email_norm = v_normalized_email)
            OR
            (v_normalized_phone IS NOT NULL AND phone_norm = v_normalized_phone)
          ))
        )
      LIMIT 1;
      
      SELECT jsonb_build_object(
        'id', id,
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'phone', phone,
        'club_id', club_id,
        'created', false,
        'reason', 'race_condition_duplicate'
      ) INTO v_existing_player
      FROM profiles
      WHERE id = v_player_id;
      
      RETURN v_existing_player;
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_player_idempotent TO authenticated;

COMMENT ON FUNCTION public.create_player_idempotent IS 
'Idempotent player creation with club-scoped uniqueness on email and phone. 
Returns existing player if duplicate detected (by idempotency key, email, or phone).
Handles race conditions gracefully.';