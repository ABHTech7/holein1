-- Ensure auth -> profiles sync via trigger and backfill missing profiles
-- 1) Create trigger on auth.users to call public.handle_new_user (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;

-- 2) Backfill profiles for existing users that are missing
INSERT INTO public.profiles (id, email, first_name, last_name, role)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'given_name', u.raw_user_meta_data->>'name'),
  COALESCE(u.raw_user_meta_data->>'last_name', u.raw_user_meta_data->>'family_name', u.raw_user_meta_data->>'surname'),
  COALESCE((u.raw_user_meta_data->>'role')::public.user_role, 'PLAYER')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;