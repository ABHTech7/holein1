-- Standardize insurance RPC: remove overloaded 3-arg version and keep single include_demo-aware function
-- 1) Drop the older overloaded function (3 args) to avoid PostgREST ambiguity
DROP FUNCTION IF EXISTS public.get_insurance_entries_data(uuid, date, date);

-- 2) Ensure the canonical 4-arg version exists and behaves correctly
CREATE OR REPLACE FUNCTION public.get_insurance_entries_data(
  company_id uuid DEFAULT NULL,
  month_start date DEFAULT NULL,
  month_end date DEFAULT NULL,
  include_demo boolean DEFAULT true
)
RETURNS TABLE(
  competition_name text,
  entry_date timestamptz,
  player_first_name text,
  player_last_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  RETURN QUERY
  SELECT 
    c.name AS competition_name,
    e.entry_date,
    p.first_name AS player_first_name,
    p.last_name AS player_last_name
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
  ORDER BY e.entry_date DESC;
END;
$$;