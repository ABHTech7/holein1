-- Create RPC function to get player's entries with proper security
CREATE OR REPLACE FUNCTION public.get_my_entries(
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0,
  p_filters JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  competition_id UUID,
  competition_name TEXT,
  club_name TEXT,
  attempt_number INTEGER,
  outcome_self TEXT,
  price_paid NUMERIC,
  is_repeat_attempt BOOLEAN,
  entry_date TIMESTAMPTZ,
  status TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id, 
    e.created_at, 
    e.competition_id,
    c.name as competition_name,
    cl.name as club_name,
    e.attempt_number,
    e.outcome_self,
    e.price_paid,
    e.is_repeat_attempt,
    e.entry_date,
    e.status
  FROM public.entries e
  JOIN public.competitions c ON c.id = e.competition_id
  JOIN public.clubs cl ON cl.id = c.club_id
  WHERE lower(e.email) = lower(auth.jwt() ->> 'email')
    AND (p_filters->>'outcome' IS NULL OR e.outcome_self = p_filters->>'outcome')
    AND (p_filters->>'club_id' IS NULL OR c.club_id::text = p_filters->>'club_id')
    AND (p_filters->>'from' IS NULL OR e.created_at >= (p_filters->>'from')::timestamptz)
    AND (p_filters->>'to' IS NULL OR e.created_at < (p_filters->>'to')::timestamptz)
    AND (
      p_filters->>'search' IS NULL OR 
      c.name ILIKE CONCAT('%', p_filters->>'search', '%')
    )
  ORDER BY e.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Create RPC function to get player's summary stats
CREATE OR REPLACE FUNCTION public.get_my_entry_totals()
RETURNS TABLE (
  total_entries BIGINT,
  competitions_played BIGINT,
  total_spend NUMERIC,
  last_played_at TIMESTAMPTZ
)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_entries,
    COUNT(DISTINCT competition_id) as competitions_played,
    COALESCE(SUM(price_paid), 0) as total_spend,
    MAX(created_at) as last_played_at
  FROM public.entries
  WHERE lower(email) = lower(auth.jwt() ->> 'email');
END;
$$;