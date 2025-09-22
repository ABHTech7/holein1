-- Fix type mismatch in get_insurance_entries_data (entry_date tz)
CREATE OR REPLACE FUNCTION public.get_insurance_entries_data(
  company_id uuid DEFAULT NULL::uuid,
  month_start date DEFAULT NULL::date,
  month_end date DEFAULT NULL::date
)
RETURNS TABLE(
  competition_id uuid,
  entry_date timestamp with time zone,
  player_first_name text,
  player_last_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user has insurance access
  IF NOT (
    get_current_user_is_admin() OR
    (get_current_user_role() = 'INSURANCE_PARTNER' AND 
     EXISTS (
       SELECT 1 FROM insurance_users iu 
       WHERE iu.user_id = auth.uid() 
       AND (company_id IS NULL OR iu.insurance_company_id = company_id)
       AND iu.active = true
     ))
  ) THEN
    RAISE EXCEPTION 'Access denied to insurance data';
  END IF;

  RETURN QUERY
  SELECT 
    e.competition_id,
    e.entry_date, -- keep timestamptz to match function return type
    p.first_name as player_first_name,
    p.last_name as player_last_name
  FROM entries e
  JOIN profiles p ON e.player_id = p.id
  WHERE 
    (month_start IS NULL OR DATE(e.entry_date) >= month_start) AND
    (month_end IS NULL OR DATE(e.entry_date) <= month_end)
  ORDER BY e.entry_date DESC;
END;
$function$;