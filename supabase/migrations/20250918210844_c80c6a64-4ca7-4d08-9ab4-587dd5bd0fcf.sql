-- Allow public viewing of active, non-archived competitions for homepage
CREATE POLICY "public_view_active_competitions" 
ON public.competitions 
FOR SELECT 
USING (status = 'ACTIVE' AND archived = false);

-- Enable RLS (if not already enabled)
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;