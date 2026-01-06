-- Add extraction mode and priority tracking columns to global_call_sheets
ALTER TABLE global_call_sheets
ADD COLUMN extraction_mode TEXT DEFAULT 'auto',
ADD COLUMN last_priority_requested_at TIMESTAMPTZ;

COMMENT ON COLUMN global_call_sheets.extraction_mode IS 'auto = normal pipeline, firecrawl_priority = force Firecrawl with relaxed thresholds';
COMMENT ON COLUMN global_call_sheets.last_priority_requested_at IS 'Timestamp when admin last requested priority Firecrawl processing';