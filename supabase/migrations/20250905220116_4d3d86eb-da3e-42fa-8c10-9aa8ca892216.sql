-- Create notes table for audit tracking and manual notes
CREATE TABLE public.notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('club', 'player', 'competition', 'payment')),
  entity_id uuid NOT NULL,
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  immutable boolean NOT NULL DEFAULT false,
  note_type text NOT NULL DEFAULT 'manual' CHECK (note_type IN ('manual', 'system_audit'))
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create policies for notes
CREATE POLICY "Admins can view all notes" 
ON public.notes 
FOR SELECT 
USING (get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY "Club members can view their entity notes" 
ON public.notes 
FOR SELECT 
USING (
  get_current_user_role() = 'CLUB'::user_role 
  AND (
    (entity_type = 'club' AND entity_id = get_current_user_club_id())
    OR 
    (entity_type IN ('competition', 'payment') AND EXISTS (
      SELECT 1 FROM competitions 
      WHERE competitions.id = notes.entity_id 
      AND competitions.club_id = get_current_user_club_id()
    ))
  )
);

CREATE POLICY "Authenticated users can create notes" 
ON public.notes 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Only manual notes can be updated, audit notes are immutable
CREATE POLICY "Users can update their own manual notes" 
ON public.notes 
FOR UPDATE 
USING (auth.uid() = created_by AND note_type = 'manual');

-- Only manual notes can be deleted, audit notes are immutable
CREATE POLICY "Admins can delete manual notes" 
ON public.notes 
FOR DELETE 
USING (get_current_user_role() = 'ADMIN'::user_role AND note_type = 'manual');

-- Add trigger for updated_at
ALTER TABLE public.notes ADD COLUMN updated_at timestamp with time zone NOT NULL DEFAULT now();

CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();