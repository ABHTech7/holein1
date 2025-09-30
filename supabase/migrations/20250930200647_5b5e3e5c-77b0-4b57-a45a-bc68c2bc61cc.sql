-- Add auto-miss columns to entries table for 12-hour automatic miss marking
ALTER TABLE public.entries
ADD COLUMN IF NOT EXISTS auto_miss_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS auto_miss_applied boolean DEFAULT false;

-- Create index for efficient auto-miss job queries
CREATE INDEX IF NOT EXISTS idx_entries_auto_miss_pending 
ON public.entries(auto_miss_at) 
WHERE auto_miss_applied = false AND outcome_self IS NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN public.entries.auto_miss_at IS 'Timestamp when entry should be automatically marked as missed (12 hours after creation)';
COMMENT ON COLUMN public.entries.auto_miss_applied IS 'Flag indicating if auto-miss has been applied to prevent duplicate processing';