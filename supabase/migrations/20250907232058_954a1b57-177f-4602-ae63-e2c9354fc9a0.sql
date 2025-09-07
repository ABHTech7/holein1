-- Manually run the auto-miss function to update all expired entries
SELECT public.update_expired_entries() as entries_updated;