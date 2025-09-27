-- Fix the venues table to include missing slug column
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS slug text;