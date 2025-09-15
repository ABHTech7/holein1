-- Fix trigger error: add missing updated_by column required by touch_club_banking_audit()
ALTER TABLE public.club_banking
ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Create a blank banking row for Shrigley Hall (safe if it already exists)
INSERT INTO public.club_banking (
  club_id, bank_account_holder, bank_account_number, bank_sort_code, bank_iban, bank_swift
) VALUES (
  '74f54310-ee8b-4b39-b3c1-76f7994647b0', '', '', '', '', ''
)
ON CONFLICT (club_id) DO NOTHING;