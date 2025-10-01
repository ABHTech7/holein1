-- Create UK-aware entries count function for admin dashboard MTD counts
CREATE OR REPLACE FUNCTION public.get_entries_count_uk(
  month_start date,
  include_demo boolean DEFAULT true
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins can access this aggregate
  IF NOT get_current_user_is_admin() THEN
    RAISE EXCEPTION 'Access denied - admin required';
  END IF;

  RETURN (
    SELECT COUNT(*)
    FROM public.entries e
    WHERE 
      DATE(e.entry_date AT TIME ZONE 'Europe/London') >= month_start
      AND (
        include_demo OR COALESCE(e.is_demo_data, false) = false
      )
  );
END;
$function$;