-- Create the missing get_incomplete_players RPC function
CREATE OR REPLACE FUNCTION public.get_incomplete_players()
RETURNS TABLE(
  id uuid,
  email text,
  first_name text,
  last_name text,
  created_at timestamp with time zone,
  has_success_payment boolean,
  has_paid_entry boolean,
  onboarding_complete boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.created_at,
    COALESCE(payment_stats.has_success_payment, false) as has_success_payment,
    COALESCE(entry_stats.has_paid_entry, false) as has_paid_entry,
    COALESCE(p.age_years IS NOT NULL AND p.phone IS NOT NULL, false) as onboarding_complete
  FROM profiles p
  LEFT JOIN (
    -- Check for successful payments (placeholder - always false for now)
    SELECT 
      p.id as player_id,
      false as has_success_payment
    FROM profiles p
    WHERE p.role = 'PLAYER'
  ) payment_stats ON p.id = payment_stats.player_id
  LEFT JOIN (
    -- Check for paid/completed entries
    SELECT 
      e.player_id,
      bool_or(e.paid = true OR e.status IN ('paid', 'completed')) as has_paid_entry
    FROM entries e
    GROUP BY e.player_id
  ) entry_stats ON p.id = entry_stats.player_id
  WHERE p.role = 'PLAYER'
    AND p.status != 'deleted'  -- Exclude soft-deleted players
    AND (
      -- Player is considered incomplete if they have:
      -- 1. No successful payments AND
      -- 2. No paid/completed entries AND/OR incomplete onboarding
      (COALESCE(payment_stats.has_success_payment, false) = false)
      AND 
      (COALESCE(entry_stats.has_paid_entry, false) = false OR COALESCE(p.age_years IS NOT NULL AND p.phone IS NOT NULL, false) = false)
    );
END;
$function$;