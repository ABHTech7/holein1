-- Create confirmation tokens table for entry confirmation flow
CREATE TABLE public.entry_confirmation_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL,
  magic_token uuid NOT NULL, -- Reference to original magic link token
  user_data jsonb NOT NULL, -- Store user info for display
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 minutes'),
  used boolean NOT NULL DEFAULT false,
  used_at timestamp with time zone NULL
);

-- Enable RLS
ALTER TABLE public.entry_confirmation_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow system/edge functions to manage tokens
CREATE POLICY "System can manage confirmation tokens" 
ON public.entry_confirmation_tokens 
FOR ALL 
USING (auth.uid() IS NULL OR auth.role() = 'service_role');

-- Add index for performance
CREATE INDEX idx_entry_confirmation_tokens_token ON public.entry_confirmation_tokens(token);
CREATE INDEX idx_entry_confirmation_tokens_expires_at ON public.entry_confirmation_tokens(expires_at);