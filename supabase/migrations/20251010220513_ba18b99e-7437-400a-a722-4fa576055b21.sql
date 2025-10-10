-- Create function to automatically calculate days overdue for payment reports
CREATE OR REPLACE FUNCTION calculate_days_overdue()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate days overdue based on current date and invoice date
  NEW.days_overdue := (CURRENT_DATE - NEW.invoice_date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically calculate days_overdue before insert or update
DROP TRIGGER IF EXISTS calculate_days_overdue_trigger ON payment_reports;
CREATE TRIGGER calculate_days_overdue_trigger
  BEFORE INSERT OR UPDATE ON payment_reports
  FOR EACH ROW
  EXECUTE FUNCTION calculate_days_overdue();

-- Create function to update all producer stats with current date calculations
CREATE OR REPLACE FUNCTION refresh_all_producer_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First, update days_overdue for all open payment reports
  UPDATE payment_reports
  SET days_overdue = (CURRENT_DATE - invoice_date)
  WHERE status != 'paid';
  
  -- Then update all producer statistics
  UPDATE producers p
  SET 
    oldest_debt_days = (
      SELECT MAX(CURRENT_DATE - pr.invoice_date)
      FROM payment_reports pr
      WHERE pr.producer_id = p.id AND pr.status != 'paid'
    );
END;
$$;

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the refresh to run daily at midnight UTC
SELECT cron.schedule(
  'refresh-producer-stats-daily',
  '0 0 * * *', -- Every day at midnight UTC
  $$SELECT refresh_all_producer_stats()$$
);

-- Run an immediate refresh to get current values
SELECT refresh_all_producer_stats();