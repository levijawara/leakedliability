-- Fix search_path for calculate_days_overdue function
CREATE OR REPLACE FUNCTION calculate_days_overdue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate days overdue based on current date and invoice date
  NEW.days_overdue := (CURRENT_DATE - NEW.invoice_date);
  RETURN NEW;
END;
$$;