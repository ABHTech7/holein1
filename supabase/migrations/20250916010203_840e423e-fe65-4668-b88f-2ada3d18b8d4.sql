-- Migration: widen `verifications.status` allowed values
-- Allows: initiated, pending, under_review, verified, approved, rejected

BEGIN;

-- 1) Drop old constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'verifications_status_check'
      AND conrelid = 'public.verifications'::regclass
  ) THEN
    ALTER TABLE public.verifications
      DROP CONSTRAINT verifications_status_check;
  END IF;
END$$;

-- 2) Recreate constraint with the full allowed set
ALTER TABLE public.verifications
  ADD CONSTRAINT verifications_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'initiated'::text,
        'pending'::text,
        'under_review'::text,
        'verified'::text,
        'approved'::text,   -- kept for backward compatibility
        'rejected'::text
      ]
    )
  );

COMMIT;