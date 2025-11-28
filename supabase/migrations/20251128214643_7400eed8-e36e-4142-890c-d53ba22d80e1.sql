-- Drop and recreate the trigger as BEFORE UPDATE to ensure closed_date is set
DROP TRIGGER IF EXISTS update_producer_stats_complete_trigger ON payment_reports;

CREATE TRIGGER update_producer_stats_complete_trigger
  BEFORE INSERT OR UPDATE ON payment_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_producer_stats_complete();