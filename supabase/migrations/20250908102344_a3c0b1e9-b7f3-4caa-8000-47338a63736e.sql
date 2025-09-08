-- Fix the get_safe_clubs_data function to include SECURITY DEFINER
-- This allows unauthenticated users to access safe club data for preview links
CREATE OR REPLACE FUNCTION public.get_safe_clubs_data()
 RETURNS TABLE(id uuid, name text, website text, logo_url text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Only return basic, non-sensitive club information
  SELECT 
    c.id,
    c.name,
    c.website,
    c.logo_url,
    c.created_at
  FROM public.clubs c
  WHERE c.archived = false 
    AND c.active = true
  ORDER BY c.created_at DESC;
$function$;