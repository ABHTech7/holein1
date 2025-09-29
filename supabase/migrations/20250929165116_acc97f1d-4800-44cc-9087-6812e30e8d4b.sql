-- Drop the old function overload that accepts include_demo parameter
-- This ensures only our fixed version without email filtering is used
DROP FUNCTION IF EXISTS public.get_public_competition_data(boolean, text, text);
DROP FUNCTION IF EXISTS public.get_public_competition_data(text, text, boolean);