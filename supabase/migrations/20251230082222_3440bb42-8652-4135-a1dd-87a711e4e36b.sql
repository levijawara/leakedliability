-- Add timing and action log columns to global_call_sheets
ALTER TABLE public.global_call_sheets 
ADD COLUMN IF NOT EXISTS parse_timing JSONB,
ADD COLUMN IF NOT EXISTS parse_action_log JSONB;