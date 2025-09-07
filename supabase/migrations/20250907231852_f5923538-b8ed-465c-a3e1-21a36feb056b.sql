-- Set up a cron job to run the auto-miss function every 5 minutes
SELECT cron.schedule(
  'auto-miss-expired-entries',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT public.update_expired_entries();
  $$
);