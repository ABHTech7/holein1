-- Create RPC to get insurance entries count (bypasses row limits)
CREATE OR REPLACE FUNCTION public.get_insurance_entries_count(
  company_id uuid DEFAULT NULL::uuid, 
  month_start date DEFAULT NULL::date, 
  month_end date DEFAULT NULL::date, 
  include_demo boolean DEFAULT true
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Access control: Admins OR insurance partners linked via insurance_users
  IF NOT (
    get_current_user_is_admin() OR
    (get_current_user_role() = 'INSURANCE_PARTNER' AND EXISTS (
      SELECT 1
      FROM insurance_users iu
      WHERE iu.user_id = auth.uid()
        AND (company_id IS NULL OR iu.insurance_company_id = company_id)
        AND iu.active = true
    ))
  ) THEN
    RAISE EXCEPTION 'Access denied to insurance data';
  END IF;

  RETURN (
    SELECT COUNT(*)
    FROM entries e
    JOIN profiles p ON e.player_id = p.id
    JOIN competitions c ON c.id = e.competition_id
    WHERE 
      (month_start IS NULL OR DATE(e.entry_date) >= month_start)
      AND (month_end IS NULL OR DATE(e.entry_date) <= month_end)
      AND (
        include_demo OR (
          COALESCE(e.is_demo_data, false) = false
          AND COALESCE(p.is_demo_data, false) = false
        )
      )
  );
END;
$function$