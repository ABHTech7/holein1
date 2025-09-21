-- Grant execute permissions to the get_incomplete_players function
GRANT EXECUTE ON FUNCTION public.get_incomplete_players() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incomplete_players() TO service_role;