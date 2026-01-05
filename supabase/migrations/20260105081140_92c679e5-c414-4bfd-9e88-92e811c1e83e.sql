-- Add canonical_producers column to global_call_sheets
-- This column stores an immutable snapshot of producer contacts extracted at FIRST parse
-- It is NEVER overwritten after initial population

ALTER TABLE global_call_sheets
ADD COLUMN IF NOT EXISTS canonical_producers JSONB DEFAULT NULL;

COMMENT ON COLUMN global_call_sheets.canonical_producers IS 
  'Immutable snapshot of producer contacts extracted at first parse. NEVER overwritten after initial population.';