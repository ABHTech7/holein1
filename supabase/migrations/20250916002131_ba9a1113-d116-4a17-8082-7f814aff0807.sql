-- Ensure base ACL privileges for authenticated role (RLS still applies)
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON TABLE
  public.clubs,
  public.competitions,
  public.entries,
  public.verifications,
  public.profiles
TO authenticated;

-- Future tables in public get SELECT for authenticated (owner-based default privileges)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO authenticated;