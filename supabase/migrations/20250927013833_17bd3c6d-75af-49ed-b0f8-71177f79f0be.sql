-- Fix venues table - add missing slug column that's expected by existing functions
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS slug text;