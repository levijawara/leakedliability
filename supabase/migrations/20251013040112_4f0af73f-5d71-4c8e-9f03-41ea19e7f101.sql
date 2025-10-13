-- Security Fix: Resolve storage policy conflicts
-- Drop the overly restrictive policy that blocks all user SELECT operations
DROP POLICY IF EXISTS "Users cannot directly list storage objects" ON storage.objects;

-- The following policies from migration 20251013034758 are now active:
-- 1. Users can upload submission documents (INSERT)
-- 2. Users can view their own submission documents (SELECT)
-- 3. Admins can manage all submission documents (ALL)

-- Security Fix: Add server-side input validation with CHECK constraints

-- Validate email formats (drop first if exists to avoid conflicts)
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_email_format 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Validate name lengths
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_name_length 
  CHECK (
    length(legal_first_name) > 0 AND length(legal_first_name) <= 100 AND
    length(legal_last_name) > 0 AND length(legal_last_name) <= 100
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Validate business name length if provided
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_business_name_length
  CHECK (business_name IS NULL OR length(business_name) <= 200);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Validate payment amounts are positive and reasonable
DO $$ BEGIN
  ALTER TABLE payment_reports ADD CONSTRAINT payment_reports_amount_positive 
  CHECK (amount_owed > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payment_reports ADD CONSTRAINT payment_reports_amount_reasonable 
  CHECK (amount_owed <= 10000000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Validate project name length
DO $$ BEGIN
  ALTER TABLE payment_reports ADD CONSTRAINT payment_reports_project_name_length
  CHECK (length(project_name) > 0 AND length(project_name) <= 500);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Validate producer email format
DO $$ BEGIN
  ALTER TABLE payment_reports ADD CONSTRAINT payment_reports_producer_email_format
  CHECK (producer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Validate payment confirmation amounts
DO $$ BEGIN
  ALTER TABLE payment_confirmations ADD CONSTRAINT payment_confirmations_amount_positive
  CHECK (amount_paid > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payment_confirmations ADD CONSTRAINT payment_confirmations_amount_reasonable
  CHECK (amount_paid <= 10000000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Validate submission fields
DO $$ BEGIN
  ALTER TABLE submissions ADD CONSTRAINT submissions_full_name_length
  CHECK (length(full_name) > 0 AND length(full_name) <= 200);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE submissions ADD CONSTRAINT submissions_email_format
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Validate dispute explanation length
DO $$ BEGIN
  ALTER TABLE disputes ADD CONSTRAINT disputes_explanation_length
  CHECK (length(explanation) >= 10 AND length(explanation) <= 5000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create validation trigger for complex submission data validation
CREATE OR REPLACE FUNCTION validate_submission_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate role_department length if provided
  IF NEW.role_department IS NOT NULL AND length(NEW.role_department) > 200 THEN
    RAISE EXCEPTION 'Role/department must be 200 characters or less';
  END IF;
  
  -- Validate form_data exists and is not empty for crew reports
  IF NEW.submission_type = 'crew_report' THEN
    IF NEW.form_data IS NULL OR NEW.form_data = '{}'::jsonb THEN
      RAISE EXCEPTION 'Form data is required for crew reports';
    END IF;
    
    -- Validate critical crew report fields exist
    IF NOT (NEW.form_data ? 'producerName') OR 
       NOT (NEW.form_data ? 'amountOwed') OR
       NOT (NEW.form_data ? 'projectName') THEN
      RAISE EXCEPTION 'Missing required crew report fields';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply validation trigger
DROP TRIGGER IF EXISTS validate_submission_data_trigger ON submissions;
CREATE TRIGGER validate_submission_data_trigger
  BEFORE INSERT OR UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION validate_submission_data();