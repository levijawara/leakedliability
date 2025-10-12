-- Create function to delete queued notification when payment is confirmed
CREATE OR REPLACE FUNCTION delete_queued_notification_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to 'paid', delete queued notification
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    DELETE FROM queued_producer_notifications
    WHERE payment_report_id = NEW.id
    AND sent_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic cleanup
CREATE TRIGGER payment_report_paid_cleanup
AFTER UPDATE ON payment_reports
FOR EACH ROW
WHEN (NEW.status = 'paid')
EXECUTE FUNCTION delete_queued_notification_on_payment();