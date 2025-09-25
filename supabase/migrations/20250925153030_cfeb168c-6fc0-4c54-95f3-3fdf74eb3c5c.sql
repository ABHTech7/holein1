-- Grant UPDATE privileges on clubs table to authenticated role
GRANT UPDATE ON TABLE public.clubs TO authenticated;

-- Also ensure SELECT is granted (should already be, but re-asserting for safety)
GRANT SELECT ON TABLE public.clubs TO authenticated;