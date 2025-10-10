-- Create function to calculate oldest_debt_days based on oldest_debt_date
CREATE OR REPLACE FUNCTION calculate_oldest_debt_days()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate oldest_debt_days from oldest_debt_date
  IF NEW.oldest_debt_date IS NOT NULL THEN
    NEW.oldest_debt_days := (CURRENT_DATE - NEW.oldest_debt_date);
  ELSE
    NEW.oldest_debt_days := 0;
  END IF;
  RETURN NEW;
END;
$$;

-- Add trigger to automatically calculate oldest_debt_days on producers table
DROP TRIGGER IF EXISTS calculate_oldest_debt_days_trigger ON producers;
CREATE TRIGGER calculate_oldest_debt_days_trigger
  BEFORE INSERT OR UPDATE ON producers
  FOR EACH ROW
  EXECUTE FUNCTION calculate_oldest_debt_days();

-- Update the refresh function to recalculate oldest_debt_days for all producers
CREATE OR REPLACE FUNCTION refresh_all_producer_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update days_overdue for all open payment reports
  UPDATE payment_reports
  SET days_overdue = (CURRENT_DATE - invoice_date)
  WHERE status != 'paid';
  
  -- Update oldest_debt_days based on oldest_debt_date
  UPDATE producers
  SET oldest_debt_days = (CURRENT_DATE - oldest_debt_date)
  WHERE oldest_debt_date IS NOT NULL;
  
  -- Set to 0 for producers with no debt date
  UPDATE producers
  SET oldest_debt_days = 0
  WHERE oldest_debt_date IS NULL;
END;
$$;

-- Run an immediate refresh to get current values
SELECT refresh_all_producer_stats();