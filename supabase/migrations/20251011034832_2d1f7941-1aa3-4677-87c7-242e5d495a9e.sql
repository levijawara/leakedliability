-- Add report_id column to submissions table
ALTER TABLE public.submissions 
ADD COLUMN report_id text;

-- Create index for faster lookups
CREATE INDEX idx_submissions_report_id ON public.submissions(report_id);

-- Function to generate unique report ID
CREATE OR REPLACE FUNCTION generate_report_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate ID format: CR-YYYYMMDD-XXXXX (CR = Crew Report)
    new_id := 'CR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');
    
    -- Check if ID already exists
    SELECT EXISTS(SELECT 1 FROM public.submissions WHERE report_id = new_id) INTO id_exists;
    
    -- Exit loop if unique
    EXIT WHEN NOT id_exists;
  END LOOP;
  
  RETURN new_id;
END;
$$;

-- Trigger to auto-generate report_id for crew_report submissions
CREATE OR REPLACE FUNCTION set_report_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only generate report_id for crew_report type submissions
  IF NEW.submission_type = 'crew_report' AND NEW.report_id IS NULL THEN
    NEW.report_id := generate_report_id();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_report_id
BEFORE INSERT ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION set_report_id();