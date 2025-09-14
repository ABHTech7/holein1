-- Make age_years nullable in profiles table to support "no age" option
ALTER TABLE public.profiles ALTER COLUMN age_years DROP NOT NULL;