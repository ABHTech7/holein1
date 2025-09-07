-- Update the handle_new_user function to better extract names from OAuth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    -- Enhanced name extraction from OAuth providers
    COALESCE(
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'given_name',
      NEW.raw_user_meta_data ->> 'name'
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'last_name',
      NEW.raw_user_meta_data ->> 'family_name',
      NEW.raw_user_meta_data ->> 'surname'
    ),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'PLAYER')
  );
  RETURN NEW;
END;
$$;