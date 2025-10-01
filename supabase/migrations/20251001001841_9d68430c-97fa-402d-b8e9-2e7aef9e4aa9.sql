-- Create UK timezone boundary helper function
CREATE OR REPLACE FUNCTION public.get_uk_month_boundaries(
  p_year integer DEFAULT NULL,
  p_month integer DEFAULT NULL
)
RETURNS TABLE(
  month_start date,
  month_end date,
  month_start_ts timestamptz,
  month_end_ts timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uk_now timestamptz;
  target_year integer;
  target_month integer;
  start_ts timestamptz;
  end_ts timestamptz;
BEGIN
  -- Get current time in UK timezone
  uk_now := timezone('Europe/London', now());
  
  -- Use provided year/month or extract from UK current time
  target_year := COALESCE(p_year, EXTRACT(YEAR FROM uk_now)::integer);
  target_month := COALESCE(p_month, EXTRACT(MONTH FROM uk_now)::integer);
  
  -- Calculate month boundaries in UK timezone
  start_ts := timezone('Europe/London', 
    make_timestamptz(target_year, target_month, 1, 0, 0, 0, 'Europe/London')
  );
  
  -- End is last moment of the month (one microsecond before next month)
  end_ts := timezone('Europe/London',
    make_timestamptz(target_year, target_month, 1, 0, 0, 0, 'Europe/London') + interval '1 month' - interval '1 microsecond'
  );
  
  RETURN QUERY SELECT
    start_ts::date AS month_start,
    end_ts::date AS month_end,
    start_ts AS month_start_ts,
    end_ts AS month_end_ts;
END;
$$;

COMMENT ON FUNCTION public.get_uk_month_boundaries IS 
'Returns UK timezone-aware month boundaries for consistent MTD calculations. Pass year/month for specific periods, or omit for current UK month.';

-- Smoke check queries (for testing)
-- SELECT now() AS utc_now, timezone('Europe/London', now()) AS uk_now;
-- SELECT * FROM public.get_uk_month_boundaries();
-- SELECT * FROM public.get_uk_month_boundaries(2025, 9);