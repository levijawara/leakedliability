-- Add email and verification tracking columns to producers table
ALTER TABLE producers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
ALTER TABLE producers ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT FALSE;

-- Create index on email for performance
CREATE INDEX IF NOT EXISTS idx_producers_email ON producers(email);

-- Add unique constraint for emails (prevents duplicate auto-created producers)
ALTER TABLE producers ADD CONSTRAINT producers_email_unique UNIQUE (email);

-- Function to generate PR-YYYYMMDD-##### format for payment reports
CREATE OR REPLACE FUNCTION generate_payment_report_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    new_id := 'PR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');
    SELECT EXISTS(SELECT 1 FROM payment_reports WHERE report_id = new_id) INTO id_exists;
    EXIT WHEN NOT id_exists;
  END LOOP;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger function to auto-set report_id for payment reports
CREATE OR REPLACE FUNCTION set_payment_report_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.report_id IS NULL THEN
    NEW.report_id := generate_payment_report_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-generating payment report IDs
DROP TRIGGER IF EXISTS trigger_set_payment_report_id ON payment_reports;
CREATE TRIGGER trigger_set_payment_report_id
BEFORE INSERT ON payment_reports
FOR EACH ROW EXECUTE FUNCTION set_payment_report_id();

-- Function to auto-create producer accounts from payment reports
CREATE OR REPLACE FUNCTION auto_create_producer_from_report()
RETURNS TRIGGER AS $$
DECLARE
  existing_producer_id UUID;
  producer_name_from_report TEXT;
  final_producer_name TEXT;
BEGIN
  -- Only proceed if producer_email is provided
  IF NEW.producer_email IS NOT NULL AND NEW.producer_email != '' THEN
    
    -- Check if producer with this email already exists
    SELECT id INTO existing_producer_id 
    FROM producers 
    WHERE email = NEW.producer_email 
    LIMIT 1;
    
    -- If no producer found, create one
    IF existing_producer_id IS NULL THEN
      
      -- Try to get producer name from existing producer_id
      IF NEW.producer_id IS NOT NULL THEN
        SELECT name INTO producer_name_from_report 
        FROM producers 
        WHERE id = NEW.producer_id;
      END IF;
      
      -- Refined naming logic: prioritize current_liable_name, then existing producer name, then default
      final_producer_name := COALESCE(NEW.current_liable_name, producer_name_from_report, 'Unverified Producer');
      
      -- Create new unverified producer
      INSERT INTO producers (
        name, 
        email, 
        verification_status, 
        auto_created, 
        account_status,
        created_by_admin
      ) VALUES (
        final_producer_name,
        NEW.producer_email,
        'unverified',
        TRUE,
        'unverified',
        FALSE
      ) RETURNING id INTO existing_producer_id;
      
      -- Update the report to point to the new producer
      NEW.producer_id := existing_producer_id;
      
    ELSE
      -- Existing producer found, update report to point to them
      NEW.producer_id := existing_producer_id;
      
      -- Update producer's email if it's empty (don't overwrite verified producers)
      UPDATE producers 
      SET email = NEW.producer_email 
      WHERE id = existing_producer_id 
        AND (email IS NULL OR email = '')
        AND verification_status = 'unverified';
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-creating producers
DROP TRIGGER IF EXISTS trigger_auto_create_producer ON payment_reports;
CREATE TRIGGER trigger_auto_create_producer
BEFORE INSERT ON payment_reports
FOR EACH ROW EXECUTE FUNCTION auto_create_producer_from_report();