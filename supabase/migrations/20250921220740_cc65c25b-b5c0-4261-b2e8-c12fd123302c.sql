-- Fix handicap column to allow NULL values in magic_link_tokens
ALTER TABLE public.magic_link_tokens 
ALTER COLUMN handicap DROP NOT NULL;