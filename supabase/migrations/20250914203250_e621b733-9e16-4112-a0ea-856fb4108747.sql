-- Migration 004: Add Foreign Key Constraints

-- Add foreign key constraints with DO blocks
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'staff_club_id_fkey') THEN
    ALTER TABLE public.staff ADD CONSTRAINT staff_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN  
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'staff_codes_club_id_fkey') THEN
    ALTER TABLE public.staff_codes ADD CONSTRAINT staff_codes_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'staff_codes_staff_id_fkey') THEN
    ALTER TABLE public.staff_codes ADD CONSTRAINT staff_codes_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'staff_codes_competition_id_fkey') THEN
    ALTER TABLE public.staff_codes ADD CONSTRAINT staff_codes_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES public.competitions(id) ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'staff_code_attempts_entry_id_fkey') THEN
    ALTER TABLE public.staff_code_attempts ADD CONSTRAINT staff_code_attempts_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.entries(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'staff_code_attempts_staff_code_id_fkey') THEN
    ALTER TABLE public.staff_code_attempts ADD CONSTRAINT staff_code_attempts_staff_code_id_fkey FOREIGN KEY (staff_code_id) REFERENCES public.staff_codes(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- Add triggers for updated_at timestamps
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'update_staff_updated_at') THEN
    CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'update_staff_codes_updated_at') THEN
    CREATE TRIGGER update_staff_codes_updated_at BEFORE UPDATE ON public.staff_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

-- Transfer ownership of helper functions to app_admin 
DO $$
BEGIN
  ALTER FUNCTION public.get_current_user_role() OWNER TO app_admin;
  ALTER FUNCTION public.get_current_user_club_id() OWNER TO app_admin;
EXCEPTION WHEN OTHERS THEN
  -- Continue if functions don't exist or ownership can't be changed
  NULL;
END
$$;