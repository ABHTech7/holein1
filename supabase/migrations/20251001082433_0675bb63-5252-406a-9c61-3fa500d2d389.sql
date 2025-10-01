-- Drop and recreate get_revenue_summaries_uk with fallback to competition.entry_fee
DROP FUNCTION IF EXISTS public.get_revenue_summaries_uk();

CREATE OR REPLACE FUNCTION public.get_revenue_summaries_uk()
RETURNS TABLE(
  today_revenue numeric,
  mtd_revenue numeric,
  ytd_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  uk_now timestamptz;
  uk_today_start timestamptz;
  uk_today_end timestamptz;
  uk_month_start timestamptz;
  uk_year_start timestamptz;
BEGIN
  -- Get current UK time
  uk_now := timezone('Europe/London', now());
  
  -- Calculate UK day boundaries
  uk_today_start := date_trunc('day', uk_now);
  uk_today_end := uk_today_start + interval '1 day';
  
  -- Calculate UK month start
  uk_month_start := date_trunc('month', uk_now);
  
  -- Calculate UK year start
  uk_year_start := date_trunc('year', uk_now);
  
  RETURN QUERY
  SELECT
    -- Today's revenue (UK timezone)
    COALESCE(SUM(
      CASE 
        WHEN timezone('Europe/London', e.entry_date) >= uk_today_start 
         AND timezone('Europe/London', e.entry_date) < uk_today_end
         AND e.paid = true
        THEN CASE 
          WHEN e.price_paid IS NOT NULL AND e.price_paid > 0 
          THEN e.price_paid 
          ELSE COALESCE(c.entry_fee, 0) 
        END
        ELSE 0
      END
    ), 0) as today_revenue,
    
    -- Month-to-date revenue (UK timezone)
    COALESCE(SUM(
      CASE 
        WHEN timezone('Europe/London', e.entry_date) >= uk_month_start
         AND e.paid = true
        THEN CASE 
          WHEN e.price_paid IS NOT NULL AND e.price_paid > 0 
          THEN e.price_paid 
          ELSE COALESCE(c.entry_fee, 0) 
        END
        ELSE 0
      END
    ), 0) as mtd_revenue,
    
    -- Year-to-date revenue (UK timezone)
    COALESCE(SUM(
      CASE 
        WHEN timezone('Europe/London', e.entry_date) >= uk_year_start
         AND e.paid = true
        THEN CASE 
          WHEN e.price_paid IS NOT NULL AND e.price_paid > 0 
          THEN e.price_paid 
          ELSE COALESCE(c.entry_fee, 0) 
        END
        ELSE 0
      END
    ), 0) as ytd_revenue
    
  FROM public.entries e
  JOIN public.competitions c ON c.id = e.competition_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_revenue_summaries_uk() TO authenticated;