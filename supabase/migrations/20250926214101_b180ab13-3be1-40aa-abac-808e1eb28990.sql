-- Remove the broken top_up_demo_entries database function
-- This function had foreign key constraint issues because it was trying to create profiles
-- without corresponding auth.users records. The functionality is now handled by 
-- the top-up-demo-data edge function which properly creates auth users first.

DROP FUNCTION IF EXISTS public.top_up_demo_entries(integer, integer, integer);