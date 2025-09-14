-- Migration 005: Add auto-miss fields to verifications table
ALTER TABLE public.verifications
  ADD COLUMN IF NOT EXISTS auto_miss_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_miss_applied boolean DEFAULT false;