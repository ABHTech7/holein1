-- Add email tracking fields to leads table
ALTER TABLE public.leads 
ADD COLUMN email_sent boolean DEFAULT false,
ADD COLUMN email_sent_at timestamp with time zone;