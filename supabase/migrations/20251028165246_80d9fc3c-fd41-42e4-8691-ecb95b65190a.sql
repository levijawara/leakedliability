-- Create trigger to auto-update payment_reports when confirmations are inserted
-- This bypasses RLS issues by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.auto_verify_payment_on_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a confirmation is inserted, mark the payment report as 'paid'
  UPDATE payment_reports
  SET 
    status = 'paid',
    payment_date = CURRENT_DATE
  WHERE id = NEW.payment_report_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires after insert on payment_confirmations
CREATE TRIGGER trigger_auto_verify_payment
AFTER INSERT ON payment_confirmations
FOR EACH ROW
EXECUTE FUNCTION auto_verify_payment_on_confirmation();