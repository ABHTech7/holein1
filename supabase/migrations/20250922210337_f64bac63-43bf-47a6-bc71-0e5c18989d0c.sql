-- Update the existing insurer user to have the correct role
UPDATE profiles 
SET role = 'INSURANCE_PARTNER' 
WHERE email = 'test@insurer.demo';

-- Update the setup_insurer_account function to use the correct role
CREATE OR REPLACE FUNCTION public.setup_insurer_account(p_email text, p_first_name text DEFAULT 'James'::text, p_last_name text DEFAULT 'Dyson'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_result jsonb;
BEGIN
  -- Get the insurance company
  SELECT id INTO v_company_id 
  FROM public.insurance_companies 
  WHERE active = true 
  LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No active insurance company found';
  END IF;

  -- Check if user exists with this email in auth.users
  SELECT u.id INTO v_user_id
  FROM auth.users u
  WHERE LOWER(u.email) = LOWER(p_email)
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Update or create profile with INSURANCE_PARTNER role
    INSERT INTO public.profiles (
      id, 
      email, 
      first_name, 
      last_name, 
      role
    ) VALUES (
      v_user_id, 
      LOWER(p_email), 
      p_first_name, 
      p_last_name, 
      'INSURANCE_PARTNER'
    ) ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      role = 'INSURANCE_PARTNER',
      updated_at = now();

    -- Link user to insurance company
    INSERT INTO public.insurance_users (
      user_id,
      insurance_company_id,
      role,
      active
    ) VALUES (
      v_user_id,
      v_company_id,
      'admin',
      true
    ) ON CONFLICT (user_id, insurance_company_id) DO UPDATE SET
      active = true,
      role = 'admin';

    v_result := jsonb_build_object(
      'success', true,
      'user_id', v_user_id,
      'company_id', v_company_id,
      'message', 'Insurer account setup completed'
    );
  ELSE
    v_result := jsonb_build_object(
      'success', false,
      'message', 'User not found in auth.users. Please create the account first.'
    );
  END IF;

  RETURN v_result;
END;
$function$;