-- Update submission_type check constraint to include vendor_report
ALTER TABLE submissions 
  DROP CONSTRAINT IF EXISTS submissions_submission_type_check;

ALTER TABLE submissions
  ADD CONSTRAINT submissions_submission_type_check 
  CHECK (submission_type IN (
    'crew_report', 
    'payment_confirmation', 
    'counter_dispute', 
    'payment_documentation', 
    'report_explanation', 
    'report_dispute',
    'vendor_report'
  ));

-- Update validation trigger to handle vendor reports
CREATE OR REPLACE FUNCTION public.validate_submission_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate role_department length if provided
  IF NEW.role_department IS NOT NULL AND length(NEW.role_department) > 200 THEN
    RAISE EXCEPTION 'Role/department must be 200 characters or less';
  END IF;
  
  -- Validate form_data exists for crew and vendor reports
  IF NEW.submission_type IN ('crew_report', 'vendor_report') THEN
    IF NEW.form_data IS NULL OR NEW.form_data = '{}'::jsonb THEN
      RAISE EXCEPTION 'Form data is required for crew and vendor reports';
    END IF;
    
    -- Validate crew report critical fields
    IF NEW.submission_type = 'crew_report' THEN
      IF NOT (NEW.form_data ? 'producerName') OR 
         NOT (NEW.form_data ? 'amountOwed') OR
         NOT (NEW.form_data ? 'projectName') THEN
        RAISE EXCEPTION 'Missing required crew report fields';
      END IF;
    END IF;
    
    -- Validate vendor report critical fields
    IF NEW.submission_type = 'vendor_report' THEN
      IF NOT (NEW.form_data ? 'vendorCompany') OR 
         NOT (NEW.form_data ? 'invoiceNumber') OR
         NOT (NEW.form_data ? 'amountOwed') OR
         NOT (NEW.form_data ? 'projectName') THEN
        RAISE EXCEPTION 'Missing required vendor report fields';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Add comment to clarify vendor usage
COMMENT ON TABLE submissions IS 'Stores all submission types including crew reports, vendor reports, payment confirmations, disputes, and producer responses';