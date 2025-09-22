-- Create insurer login account
-- First, create user profile for James Dyson with INSURANCE_PARTNER role (assuming it exists or we'll use a different role)
-- Note: We need to insert into the insurance_users table to link user to insurance company

-- First ensure there's an active insurance company, or create one for demo
INSERT INTO public.insurance_companies (
  id, 
  name, 
  contact_email, 
  premium_rate_per_entry, 
  active
) VALUES (
  gen_random_uuid(), 
  'Demo Insurance Company', 
  'contact@demoinsurance.com', 
  1.15, 
  true
) ON CONFLICT DO NOTHING;

-- Create a function to set up the insurer user account (will be called after manual user creation)
CREATE OR REPLACE FUNCTION public.setup_insurer_account(
  p_email text,
  p_first_name text DEFAULT 'James',
  p_last_name text DEFAULT 'Dyson'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    -- Update or create profile
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
      'PLAYER'
    ) ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
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
$$;