-- Harden the trigger to prevent NULL payment_report_id
CREATE OR REPLACE FUNCTION public.auto_verify_payment_on_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Guard: prevent NULL reference that causes 21000 error
  IF NEW.payment_report_id IS NULL THEN
    RAISE EXCEPTION 'payment_report_id cannot be NULL';
  END IF;

  -- Safe update with guaranteed non-NULL WHERE clause
  UPDATE payment_reports
  SET 
    status = 'paid',
    payment_date = CURRENT_DATE
  WHERE id = NEW.payment_report_id;
  
  RETURN NEW;
END;
$$;