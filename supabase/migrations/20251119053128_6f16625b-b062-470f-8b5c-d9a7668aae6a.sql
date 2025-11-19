-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_auto_create_producer ON payment_reports;
DROP FUNCTION IF EXISTS auto_create_producer_from_report();

-- Create refined version with dual lookup (email + name)
CREATE OR REPLACE FUNCTION auto_create_producer_from_report()
RETURNS TRIGGER AS $$
DECLARE
  existing_producer_id UUID;
  producer_name_from_report TEXT;
  final_producer_name TEXT;
BEGIN
  -- Only create if producer_email OR current_liable_name exists
  IF (NEW.producer_email IS NOT NULL AND NEW.producer_email != '')
     OR (NEW.current_liable_name IS NOT NULL AND NEW.current_liable_name != '') THEN

    -- Check by email if provided
    IF NEW.producer_email IS NOT NULL AND NEW.producer_email != '' THEN
      SELECT id INTO existing_producer_id
      FROM producers
      WHERE email = NEW.producer_email
      LIMIT 1;
    END IF;

    -- If not found by email, and we have a liable name, search by EXACT name match
    IF existing_producer_id IS NULL AND NEW.current_liable_name IS NOT NULL THEN
      SELECT id INTO existing_producer_id
      FROM producers
      WHERE name = NEW.current_liable_name
      LIMIT 1;
    END IF;

    -- Still no producer found → create one
    IF existing_producer_id IS NULL THEN

      IF NEW.producer_id IS NOT NULL THEN
        SELECT name INTO producer_name_from_report
        FROM producers
        WHERE id = NEW.producer_id;
      END IF;

      final_producer_name := COALESCE(
        NEW.current_liable_name,
        producer_name_from_report,
        'Unverified Producer'
      );

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
      )
      RETURNING id INTO existing_producer_id;

      NEW.producer_id := existing_producer_id;

    ELSE
      NEW.producer_id := existing_producer_id;

      -- Only fill missing email on unverified producers
      IF NEW.producer_email IS NOT NULL THEN
        UPDATE producers
        SET email = NEW.producer_email
        WHERE id = existing_producer_id
        AND (email IS NULL OR email = '')
        AND verification_status = 'unverified';
      END IF;

    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_auto_create_producer
BEFORE INSERT ON payment_reports
FOR EACH ROW EXECUTE FUNCTION auto_create_producer_from_report();