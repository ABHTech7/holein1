-- Remove max_participants column from competitions table
ALTER TABLE public.competitions 
DROP COLUMN max_participants;

-- Add archived column to competitions table
ALTER TABLE public.competitions 
ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;

-- Add archived column to clubs table  
ALTER TABLE public.clubs 
ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;

-- Create index for better performance on archived queries
CREATE INDEX idx_competitions_archived ON public.competitions(archived);
CREATE INDEX idx_clubs_archived ON public.clubs(archived);

-- Update RLS policies to handle archived status
-- For competitions - exclude archived from main views
DROP POLICY IF EXISTS "Everyone can view active competitions" ON public.competitions;
CREATE POLICY "Everyone can view active competitions" 
ON public.competitions 
FOR SELECT 
USING (archived = false);

-- For clubs - exclude archived from main views
DROP POLICY IF EXISTS "Everyone can view clubs" ON public.clubs;
CREATE POLICY "Everyone can view active clubs" 
ON public.clubs 
FOR SELECT 
USING (archived = false);

-- Add policies for admins to view archived records
CREATE POLICY "Admins can view archived competitions" 
ON public.competitions 
FOR SELECT 
USING (get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY "Admins can view archived clubs" 
ON public.clubs 
FOR SELECT 
USING (get_current_user_role() = 'ADMIN'::user_role);