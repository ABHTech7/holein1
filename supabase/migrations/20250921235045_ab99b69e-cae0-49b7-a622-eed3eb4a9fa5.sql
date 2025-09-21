-- Fix historical entries status based on their outcomes
UPDATE public.entries 
SET status = 'completed', updated_at = now()
WHERE outcome_self IN ('win', 'miss') 
  AND status != 'completed';