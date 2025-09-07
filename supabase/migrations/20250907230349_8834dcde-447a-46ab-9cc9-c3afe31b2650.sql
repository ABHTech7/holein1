-- Phase 1: Complete security fix with column-level access control
-- Update the anonymous/public policy to only allow safe fields
DROP POLICY IF EXISTS "Anonymous users can view active clubs for public view" ON public.clubs;
DROP POLICY IF EXISTS "Authenticated users can view basic club info" ON public.clubs;

-- Create a secure public view that only exposes safe data
CREATE OR REPLACE VIEW public.clubs_safe AS
SELECT 
  id,
  name,
  website,
  logo_url,
  created_at
FROM public.clubs 
WHERE archived = false AND active = true;

-- Enable RLS on the view
ALTER VIEW public.clubs_safe ENABLE ROW LEVEL SECURITY;

-- Allow public access to the safe view
CREATE POLICY "Public can view safe club data" 
ON public.clubs_safe 
FOR SELECT 
USING (true);

-- Update the authenticated users policy to still allow basic access for logged in users
CREATE POLICY "Authenticated users can view basic club info" 
ON public.clubs 
FOR SELECT 
USING (
  archived = false 
  AND active = true 
  AND auth.uid() IS NOT NULL
);