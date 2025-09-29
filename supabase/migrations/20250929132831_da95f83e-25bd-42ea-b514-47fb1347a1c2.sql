-- Fix the get_insurance_entries_data function to properly work with all entries
-- Since insurance companies should see all entries in the system

CREATE OR REPLACE FUNCTION public.get_insurance_entries_data(
  company_id uuid DEFAULT NULL::uuid, 
  month_start date DEFAULT NULL::date, 
  month_end date DEFAULT NULL::date
)
RETURNS TABLE(
  competition_name text, 
  entry_date timestamp with time zone, 
  player_first_name text, 
  player_last_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user has insurance access (admin or insurance partner)
  IF NOT (
    get_current_user_is_admin() OR
    (get_current_user_role() = 'INSURANCE_PARTNER' AND 
     EXISTS (
       SELECT 1 FROM insurance_users iu 
       WHERE iu.user_id = auth.uid() 
       AND iu.active = true
     ))
  ) THEN
    RAISE EXCEPTION 'Access denied to insurance data';
  END IF;

  -- Return entries data filtered by date range
  -- Insurance companies can see all entries regardless of company_id parameter
  RETURN QUERY
  SELECT 
    c.name AS competition_name,
    e.entry_date,
    p.first_name as player_first_name,
    p.last_name as player_last_name
  FROM entries e
  JOIN profiles p ON e.player_id = p.id
  JOIN competitions c ON c.id = e.competition_id
  WHERE 
    (month_start IS NULL OR DATE(e.entry_date) >= month_start) AND
    (month_end IS NULL OR DATE(e.entry_date) <= month_end)
    AND COALESCE(e.is_demo_data, false) = false  -- Exclude demo data
    AND COALESCE(p.is_demo_data, false) = false  -- Exclude demo players
  ORDER BY e.entry_date DESC;
END;
$function$;