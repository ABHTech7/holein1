-- Create table for custom magic link tokens
CREATE TABLE public.magic_link_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,
  age_years INTEGER NOT NULL,
  handicap NUMERIC NOT NULL,
  competition_url TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.magic_link_tokens ENABLE ROW LEVEL SECURITY;

-- Create index for token lookup
CREATE INDEX idx_magic_link_tokens_token ON public.magic_link_tokens(token);
CREATE INDEX idx_magic_link_tokens_email ON public.magic_link_tokens(email);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_magic_link_tokens_updated_at
BEFORE UPDATE ON public.magic_link_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies (very restrictive since this is handled by edge functions)
CREATE POLICY "Magic link tokens are not accessible via client"
ON public.magic_link_tokens
FOR ALL
USING (false);