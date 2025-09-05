-- Add contract/agreement fields to clubs table
ALTER TABLE public.clubs ADD COLUMN contract_signed boolean NOT NULL DEFAULT false;
ALTER TABLE public.clubs ADD COLUMN contract_url text;
ALTER TABLE public.clubs ADD COLUMN contract_signed_date timestamp with time zone;
ALTER TABLE public.clubs ADD COLUMN contract_signed_by_name text;
ALTER TABLE public.clubs ADD COLUMN contract_signed_by_email text;