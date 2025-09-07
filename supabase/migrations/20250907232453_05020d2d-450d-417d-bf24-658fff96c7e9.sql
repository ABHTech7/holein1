-- Run the auto-miss function to update expired entries
SELECT public.update_expired_entries() as entries_updated;