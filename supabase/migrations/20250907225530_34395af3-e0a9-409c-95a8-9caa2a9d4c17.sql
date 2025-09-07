-- Fix security definer view issue
-- Drop the existing view with SECURITY DEFINER
DROP VIEW IF EXISTS public.clubs_public;

-- Recreate the view without SECURITY DEFINER (safer approach)
CREATE VIEW public.clubs_public AS
SELECT 
  id,
  name,
  website,
  created_at
FROM public.clubs
WHERE archived = false 
  AND active = true;

-- Grant proper access to the view
GRANT SELECT ON public.clubs_public TO anon, authenticated;

-- Also drop the unnecessary function since we're using the view approach
DROP FUNCTION IF EXISTS public.get_public_club_info();