-- Fix search_path for generate_report_id function
CREATE OR REPLACE FUNCTION generate_report_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix search_path for set_report_id function
CREATE OR REPLACE FUNCTION set_report_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate report_id for crew_report type submissions
  IF NEW.submission_type = 'crew_report' AND NEW.report_id IS NULL THEN
    NEW.report_id := generate_report_id();
  END IF;
  
  RETURN NEW;
END;
$$;