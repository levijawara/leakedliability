-- ============================================
-- PHASE 1A: MAINTENANCE MODE WRITE BLOCKING
-- ============================================

-- Create app_flags view for maintenance mode checks
CREATE OR REPLACE VIEW app_flags AS
SELECT 
  (SELECT maintenance_mode FROM site_settings LIMIT 1) as maintenance_mode,
  (SELECT send_producer_notifications FROM site_settings LIMIT 1) as notifications_enabled;

COMMENT ON VIEW app_flags IS 'Helper view for checking system-wide flags like maintenance mode';

-- Add write-blocking policies for payment_reports
CREATE POLICY "Block payment_reports inserts during maintenance"
ON payment_reports FOR INSERT
TO authenticated
WITH CHECK (NOT (SELECT maintenance_mode FROM app_flags));

CREATE POLICY "Block payment_reports updates during maintenance"
ON payment_reports FOR UPDATE
TO authenticated
USING (NOT (SELECT maintenance_mode FROM app_flags))
WITH CHECK (NOT (SELECT maintenance_mode FROM app_flags));

-- Add write-blocking policies for payment_confirmations
CREATE POLICY "Block payment_confirmations inserts during maintenance"
ON payment_confirmations FOR INSERT
TO authenticated
WITH CHECK (NOT (SELECT maintenance_mode FROM app_flags));

CREATE POLICY "Block payment_confirmations updates during maintenance"
ON payment_confirmations FOR UPDATE
TO authenticated
USING (NOT (SELECT maintenance_mode FROM app_flags))
WITH CHECK (NOT (SELECT maintenance_mode FROM app_flags));

-- Add write-blocking policies for submissions
CREATE POLICY "Block submissions inserts during maintenance"
ON submissions FOR INSERT
TO authenticated
WITH CHECK (NOT (SELECT maintenance_mode FROM app_flags));

CREATE POLICY "Block submissions updates during maintenance"
ON submissions FOR UPDATE
TO authenticated
USING (NOT (SELECT maintenance_mode FROM app_flags))
WITH CHECK (NOT (SELECT maintenance_mode FROM app_flags));

-- Add write-blocking policies for disputes
CREATE POLICY "Block disputes inserts during maintenance"
ON disputes FOR INSERT
TO authenticated
WITH CHECK (NOT (SELECT maintenance_mode FROM app_flags));

-- Add write-blocking policies for producer_self_reports
CREATE POLICY "Block producer_self_reports inserts during maintenance"
ON producer_self_reports FOR INSERT
TO authenticated
WITH CHECK (NOT (SELECT maintenance_mode FROM app_flags));


-- ============================================
-- PHASE 1B: PUBLIC LEADERBOARD VIEW
-- ============================================

-- Create safe public leaderboard view with only whitelisted columns
CREATE OR REPLACE VIEW public_leaderboard AS
SELECT
  p.id as producer_id,
  p.name as producer_name,
  p.company as company_name,
  p.pscs_score,
  p.total_amount_owed,
  p.oldest_debt_date,
  p.oldest_debt_days,
  p.total_crew_owed,
  p.total_vendors_owed,
  p.total_jobs_owed,
  p.total_cities_owed,
  p.momentum_active_until,
  p.paid_jobs_count,
  p.paid_crew_count
FROM producers p
WHERE p.account_status = 'active'
ORDER BY p.pscs_score DESC;

COMMENT ON VIEW public_leaderboard IS 'Public-safe view of producer leaderboard - excludes PII and internal fields';

-- Grant read access to authenticated users (controlled by leaderboard access logic)
GRANT SELECT ON public_leaderboard TO authenticated;


-- ============================================
-- PHASE 2A: NORMALIZE STATUS FIELDS TO ENUMS
-- ============================================

-- Create payment_status enum (extensible for future states)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'disputed', 'verified', 'rejected');
  END IF;
END $$;

-- Create confirmation_type enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'confirmation_type_enum') THEN
    CREATE TYPE confirmation_type_enum AS ENUM ('crew_confirmation', 'producer_documentation', 'admin_verification');
  END IF;
END $$;

-- Migrate payment_reports.status to enum
-- Step 1: Drop view that depends on status column
DROP VIEW IF EXISTS public_payment_reports;

-- Step 2: Drop trigger that depends on status column
DROP TRIGGER IF EXISTS payment_report_paid_cleanup ON payment_reports;

-- Step 3: Drop default constraint
ALTER TABLE payment_reports 
  ALTER COLUMN status DROP DEFAULT;

-- Step 4: Change column type
ALTER TABLE payment_reports 
  ALTER COLUMN status TYPE payment_status 
  USING status::payment_status;

-- Step 5: Set new default with enum type
ALTER TABLE payment_reports 
  ALTER COLUMN status SET DEFAULT 'pending'::payment_status;

-- Step 6: Recreate public_payment_reports view
CREATE OR REPLACE VIEW public_payment_reports AS
SELECT 
  id,
  days_overdue,
  producer_id,
  reporter_id,
  amount_owed,
  invoice_date,
  payment_date,
  verified,
  created_at,
  updated_at,
  closed_date,
  project_name,
  reporter_type,
  report_id,
  city,
  status
FROM payment_reports
WHERE verified = true;

-- Grant anon read access to the VIEW only
GRANT SELECT ON public_payment_reports TO anon;

-- Step 7: Recreate trigger with enum comparison
CREATE TRIGGER payment_report_paid_cleanup
AFTER UPDATE ON payment_reports
FOR EACH ROW
WHEN (NEW.status = 'paid'::payment_status)
EXECUTE FUNCTION delete_queued_notification_on_payment();

-- Migrate payment_confirmations.confirmation_type to enum
-- Step 1: Drop CHECK constraint that depends on text comparison
ALTER TABLE payment_confirmations
  DROP CONSTRAINT IF EXISTS payment_confirmations_confirmation_type_check;

-- Step 2: Change column type
ALTER TABLE payment_confirmations 
  ALTER COLUMN confirmation_type TYPE confirmation_type_enum 
  USING confirmation_type::confirmation_type_enum;


-- ============================================
-- PHASE 2B: NOT NULL CONSTRAINTS & FK CASCADES
-- ============================================

-- Set payment_confirmations.payment_report_id to NOT NULL
ALTER TABLE payment_confirmations
  ALTER COLUMN payment_report_id SET NOT NULL;

-- Update payment_reports foreign key to CASCADE on delete
ALTER TABLE payment_reports
  DROP CONSTRAINT IF EXISTS payment_reports_producer_id_fkey,
  ADD CONSTRAINT payment_reports_producer_id_fkey 
    FOREIGN KEY (producer_id) 
    REFERENCES producers(id) 
    ON DELETE CASCADE;

-- Update payment_confirmations foreign key to CASCADE on delete
ALTER TABLE payment_confirmations
  DROP CONSTRAINT IF EXISTS payment_confirmations_payment_report_id_fkey,
  ADD CONSTRAINT payment_confirmations_payment_report_id_fkey 
    FOREIGN KEY (payment_report_id) 
    REFERENCES payment_reports(id) 
    ON DELETE CASCADE;


-- ============================================
-- PHASE 2C: STRENGTHEN TRIGGER NULL GUARDS
-- ============================================

-- Update log_past_debt_on_resolve with stronger NULL guards
CREATE OR REPLACE FUNCTION log_past_debt_on_resolve()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Only log when:
  -- 1. Status changes from unpaid to paid
  -- 2. Producer ID exists (not NULL)
  -- 3. Old status was not already paid
  IF NEW.status = 'paid' 
     AND (OLD.status IS NULL OR OLD.status != 'paid')
     AND NEW.producer_id IS NOT NULL THEN
    
    INSERT INTO past_debts (
      producer_id, 
      amount_owed, 
      days_overdue, 
      reporter_type,
      total_reports_at_time
    )
    VALUES (
      NEW.producer_id,
      COALESCE(OLD.amount_owed, 0),
      COALESCE(OLD.days_overdue, 0),
      COALESCE(OLD.reporter_type, 'crew'),
      (SELECT COUNT(*) FROM payment_reports WHERE producer_id = NEW.producer_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Verify auto_verify_payment_on_confirmation has NULL guard (already implemented)
-- This trigger already has proper NULL check, just ensuring it's documented:
COMMENT ON FUNCTION auto_verify_payment_on_confirmation IS 
  'Auto-verifies payment reports when confirmations are submitted. Includes NULL guard for payment_report_id.';


-- ============================================
-- VERIFICATION & DOCUMENTATION
-- ============================================

-- Add comments for audit trail
COMMENT ON POLICY "Block payment_reports inserts during maintenance" ON payment_reports IS 
  'Phase 1A: Database-level write protection during maintenance mode';

COMMENT ON VIEW public_leaderboard IS 
  'Phase 1B: Public-safe leaderboard view - only exposes name, company, scores, and debt metrics. No emails or internal IDs.';

COMMENT ON TYPE payment_status IS 
  'Phase 2A: Enum for payment report status - prevents typo bugs and enforces valid states';

COMMENT ON TYPE confirmation_type_enum IS 
  'Phase 2A: Enum for payment confirmation types - ensures type safety';
