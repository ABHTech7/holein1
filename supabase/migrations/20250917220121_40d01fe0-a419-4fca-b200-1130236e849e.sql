-- Create view for incomplete players that can be safely deleted
CREATE OR REPLACE VIEW incomplete_players_v1 AS
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
  -- Check for successful payments (this would be from a payments table if it exists)
  -- For now, we'll use a placeholder that always returns false
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
  AND (
    -- Player is considered incomplete if they have:
    -- 1. No successful payments AND
    -- 2. No paid/completed entries AND/OR incomplete onboarding
    (COALESCE(payment_stats.has_success_payment, false) = false)
    AND 
    (COALESCE(entry_stats.has_paid_entry, false) = false OR COALESCE(p.age_years IS NOT NULL AND p.phone IS NOT NULL, false) = false)
  );

-- Create audit logs table for tracking admin deletions
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES profiles(id),
  target_user_id uuid,
  action text NOT NULL,
  reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin can view all audit logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- System can insert audit logs (service role)
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Add soft delete columns to profiles if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deleted_at') THEN
    ALTER TABLE profiles ADD COLUMN deleted_at timestamp with time zone;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'status') THEN
    ALTER TABLE profiles ADD COLUMN status text DEFAULT 'active';
  END IF;
END $$;