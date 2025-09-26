-- Fix demo data visibility by updating RLS policies
-- Update the public competition viewing policy to exclude demo data
DROP POLICY IF EXISTS "public_view_active_competitions" ON public.competitions;

CREATE POLICY "public_view_active_competitions" 
ON public.competitions 
FOR SELECT 
USING (
  status = 'ACTIVE'::competition_status 
  AND archived = false 
  AND COALESCE(is_demo_data, false) = false
);