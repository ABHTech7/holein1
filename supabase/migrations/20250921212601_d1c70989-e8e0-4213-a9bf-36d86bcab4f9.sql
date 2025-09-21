-- Secure function to update club contract status with proper auth checks
CREATE OR REPLACE FUNCTION public.update_club_contract_status(
  p_club_id uuid,
  p_signed boolean,
  p_signed_by_name text DEFAULT NULL,
  p_signed_by_email text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role public.user_role;
  v_user_id uuid;
  v_is_owner boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE='28000';
  END IF;

  v_role := public.get_current_user_role();
  v_is_owner := (public.get_current_user_club_id() = p_club_id);

  IF NOT (v_role = 'ADMIN' OR (v_role = 'CLUB' AND v_is_owner)) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE='28000';
  END IF;

  IF p_signed THEN
    UPDATE public.clubs
    SET 
      contract_signed = true,
      contract_signed_date = now(),
      contract_signed_by_name = COALESCE(p_signed_by_name, contract_signed_by_name),
      contract_signed_by_email = COALESCE(p_signed_by_email, contract_signed_by_email),
      updated_at = now()
    WHERE id = p_club_id;
  ELSE
    UPDATE public.clubs
    SET 
      contract_signed = false,
      contract_signed_date = NULL,
      contract_signed_by_name = NULL,
      contract_signed_by_email = NULL,
      updated_at = now()
    WHERE id = p_club_id;
  END IF;

  RETURN true;
END;
$$;

-- Allow authenticated clients to execute this function
GRANT EXECUTE ON FUNCTION public.update_club_contract_status(uuid, boolean, text, text) TO authenticated;