-- Create RPC function to get revenue summaries in UK timezone
CREATE OR REPLACE FUNCTION public.get_revenue_summaries_uk()
RETURNS TABLE(
  today_total numeric,
  mtd_total numeric,
  ytd_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
DECLARE
  uk_now timestamp with time zone;
  today_start timestamp with time zone;
  month_start timestamp with time zone;
  year_start timestamp with time zone;
BEGIN
  -- Calculate UK timezone boundaries
  uk_now := timezone('Europe/London', now());
  today_start := date_trunc('day', uk_now);
  month_start := date_trunc('month', uk_now);
  year_start := date_trunc('year', uk_now);

  RETURN QUERY
  WITH competition_fees AS (
    SELECT id, entry_fee FROM public.competitions
  )
  SELECT
    -- Today's revenue: sum price_paid or competition entry_fee for paid entries today (UK)
    COALESCE(
      (SELECT SUM(
        COALESCE(e.price_paid, cf.entry_fee, 0)
      )::numeric
      FROM public.entries e
      LEFT JOIN competition_fees cf ON e.competition_id = cf.id
      WHERE e.paid = true
        AND timezone('Europe/London', e.entry_date) >= today_start
        AND timezone('Europe/London', e.entry_date) < today_start + interval '1 day'
      ), 0
    ) as today_total,
    
    -- Month-to-date revenue
    COALESCE(
      (SELECT SUM(
        COALESCE(e.price_paid, cf.entry_fee, 0)
      )::numeric
      FROM public.entries e
      LEFT JOIN competition_fees cf ON e.competition_id = cf.id
      WHERE e.paid = true
        AND timezone('Europe/London', e.entry_date) >= month_start
      ), 0
    ) as mtd_total,
    
    -- Year-to-date revenue
    COALESCE(
      (SELECT SUM(
        COALESCE(e.price_paid, cf.entry_fee, 0)
      )::numeric
      FROM public.entries e
      LEFT JOIN competition_fees cf ON e.competition_id = cf.id
      WHERE e.paid = true
        AND timezone('Europe/London', e.entry_date) >= year_start
      ), 0
    ) as ytd_total;
END;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_revenue_summaries_uk() TO authenticated;