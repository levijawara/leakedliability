-- Phase 6: Add retry tracking columns to call_sheets
ALTER TABLE call_sheets 
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS parsing_started_at timestamptz,
ADD COLUMN IF NOT EXISTS last_error_at timestamptz;