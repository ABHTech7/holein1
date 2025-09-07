-- Trigger the updated function by updating the club name to force slug regeneration
UPDATE public.clubs 
SET name = 'Shrigley Hall Golf Club', updated_at = now()
WHERE id = '74f54310-ee8b-4b39-b3c1-76f7994647b0';