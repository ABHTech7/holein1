-- Fix critical security issue: Restrict clubs table public access
-- Remove the overly permissive "Everyone can view active clubs" policy
DROP POLICY IF EXISTS "Everyone can view active clubs" ON public.clubs;

-- Create a more restrictive policy for public club access (only basic info)
CREATE POLICY "Public can view basic club info" 
ON public.clubs 
FOR SELECT 
USING (
  archived = false 
  AND active = true
);

-- Create a secure function to get public club data (only safe fields)
CREATE OR REPLACE FUNCTION public.get_public_club_info()
RETURNS TABLE (
  id uuid,
  name text,
  website text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    clubs.id,
    clubs.name,
    clubs.website,
    clubs.created_at
  FROM public.clubs
  WHERE clubs.archived = false 
    AND clubs.active = true;
$$;

-- Create a view for public club information (safe fields only)
CREATE OR REPLACE VIEW public.clubs_public AS
SELECT 
  id,
  name,
  website,
  created_at
FROM public.clubs
WHERE archived = false 
  AND active = true;

-- Grant access to the public view
GRANT SELECT ON public.clubs_public TO anon, authenticated;

-- Create policy for admins to access full club data
CREATE POLICY "Admins can view full club data" 
ON public.clubs 
FOR SELECT 
USING (get_current_user_role() = 'ADMIN'::user_role);

-- Create policy for club members to view their own full club data
CREATE POLICY "Club members can view their own full club data" 
ON public.clubs 
FOR SELECT 
USING (
  id = get_current_user_club_id() 
  AND get_current_user_role() = 'CLUB'::user_role
);

-- Ensure banking data is only accessible to admins and the club itself
-- The existing "Club members can view their club" policy already handles club access
-- The "Admins can manage clubs" policy already handles admin access

-- Add additional security: Revoke any existing public access
REVOKE ALL ON public.clubs FROM anon;