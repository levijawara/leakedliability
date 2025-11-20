-- Add sub_name column to producers table for production company tagging
ALTER TABLE producers ADD COLUMN IF NOT EXISTS sub_name TEXT;

-- Add production_company_name to image_generations for logging
ALTER TABLE image_generations ADD COLUMN IF NOT EXISTS production_company_name TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_producers_sub_name ON producers(sub_name) WHERE sub_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_producers_name_lookup ON producers(LOWER(name));

-- Add trigger to clear sub_name when producer reaches zero unpaid debts
CREATE OR REPLACE FUNCTION clear_sub_name_on_debt_resolution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  unpaid_count INTEGER;
BEGIN
  -- Check if this is a status change to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Count unpaid reports for this producer
    SELECT COUNT(*) INTO unpaid_count
    FROM payment_reports
    WHERE producer_id = NEW.producer_id AND status != 'paid';
    
    -- If no unpaid debts remain, clear the sub_name
    IF unpaid_count = 0 THEN
      UPDATE producers
      SET sub_name = NULL
      WHERE id = NEW.producer_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS clear_sub_name_on_resolution ON payment_reports;
CREATE TRIGGER clear_sub_name_on_resolution
  AFTER UPDATE ON payment_reports
  FOR EACH ROW
  EXECUTE FUNCTION clear_sub_name_on_debt_resolution();