-- Migration 002: Enhanced RLS Policies

-- Enable RLS on new tables
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_codes ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.staff_code_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

-- Staff table policies
CREATE POLICY "Admins can manage all staff" ON public.staff
FOR ALL USING (get_current_user_role() = 'ADMIN');

CREATE POLICY "Club members can view their staff" ON public.staff  
FOR SELECT USING (
  club_id = get_current_user_club_id() AND 
  get_current_user_role() = 'CLUB'
);

CREATE POLICY "Club members can manage their staff" ON public.staff
FOR ALL USING (
  club_id = get_current_user_club_id() AND 
  get_current_user_role() = 'CLUB'
);

-- Staff codes table policies  
CREATE POLICY "Admins can manage all staff codes" ON public.staff_codes
FOR ALL USING (get_current_user_role() = 'ADMIN');

CREATE POLICY "Club members can manage their staff codes" ON public.staff_codes
FOR ALL USING (
  club_id = get_current_user_club_id() AND 
  get_current_user_role() = 'CLUB'
);

CREATE POLICY "Players can validate staff codes during entry" ON public.staff_codes
FOR SELECT USING (
  active = TRUE AND 
  now() BETWEEN valid_from AND valid_until AND
  (max_uses IS NULL OR current_uses < max_uses)
);

-- Staff code attempts table policies
CREATE POLICY "Admins can view all staff code attempts" ON public.staff_code_attempts  
FOR SELECT USING (get_current_user_role() = 'ADMIN');

CREATE POLICY "Club members can view attempts for their competitions" ON public.staff_code_attempts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM entries e 
    JOIN competitions c ON e.competition_id = c.id
    WHERE e.id = staff_code_attempts.entry_id 
    AND c.club_id = get_current_user_club_id()
    AND get_current_user_role() = 'CLUB'
  )
);

CREATE POLICY "Players can create attempts for their entries" ON public.staff_code_attempts  
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM entries 
    WHERE id = staff_code_attempts.entry_id 
    AND player_id = auth.uid()
  )
);

-- Uploaded files table policies
CREATE POLICY "Admins can manage all files" ON public.uploaded_files
FOR ALL USING (get_current_user_role() = 'ADMIN');

CREATE POLICY "Users can manage their own files" ON public.uploaded_files
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Club members can view files for their competition entries" ON public.uploaded_files
FOR SELECT USING (
  get_current_user_role() = 'CLUB' AND
  EXISTS (
    SELECT 1 FROM entries e 
    JOIN competitions c ON e.competition_id = c.id
    WHERE e.player_id = uploaded_files.user_id 
    AND c.club_id = get_current_user_club_id()
  )
);