-- ============================================================
-- PHASE 3: Vendor Integration - Database Schema Updates
-- ============================================================

-- 1. Add reporter_type column to payment_reports
ALTER TABLE payment_reports 
  ADD COLUMN reporter_type text CHECK (reporter_type IN ('crew', 'vendor')) DEFAULT 'crew';

-- Backfill existing data
UPDATE payment_reports SET reporter_type = 'crew' WHERE reporter_type IS NULL;

-- Add index for performance
CREATE INDEX idx_payment_reports_reporter_type ON payment_reports(reporter_type, status);

-- 2. Add vendor tracking columns to producers table
ALTER TABLE producers
  ADD COLUMN total_vendors_owed integer DEFAULT 0,
  ADD COLUMN total_vendor_debt numeric DEFAULT 0;

-- 3. Add vendor penalty configuration to pscs_config
INSERT INTO pscs_config (key, value, description) VALUES
  ('VENDOR_PENALTY_MULTIPLIER', 1.5, 'Multiplier for vendor debt age/amount penalties (heavier than crew)'),
  ('VENDOR_COUNT_PENALTY', 20, 'Additional penalty per vendor owed (higher impact than crew)');

-- 4. Update producer stats trigger to include vendor metrics
CREATE OR REPLACE FUNCTION public.update_producer_stats_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Auto-set closed_date when status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    NEW.closed_date := COALESCE(NEW.payment_date, CURRENT_DATE);
  END IF;
  
  -- Update producer stats
  UPDATE public.producers
  SET 
    pscs_score = public.calculate_pscs_score(COALESCE(NEW.producer_id, OLD.producer_id)),
    total_amount_owed = (
      SELECT COALESCE(SUM(amount_owed), 0)
      FROM public.payment_reports 
      WHERE producer_id = COALESCE(NEW.producer_id, OLD.producer_id) AND status != 'paid'
    ),
    oldest_debt_date = (
      SELECT MIN(invoice_date)
      FROM public.payment_reports 
      WHERE producer_id = COALESCE(NEW.producer_id, OLD.producer_id) AND status != 'paid'
    ),
    oldest_debt_days = (
      SELECT MAX(days_overdue)
      FROM public.payment_reports 
      WHERE producer_id = COALESCE(NEW.producer_id, OLD.producer_id) AND status != 'paid'
    ),
    total_crew_owed = (
      SELECT COUNT(DISTINCT reporter_id)
      FROM public.payment_reports 
      WHERE producer_id = COALESCE(NEW.producer_id, OLD.producer_id) 
        AND status != 'paid' 
        AND reporter_type = 'crew'
    ),
    total_vendors_owed = (
      SELECT COUNT(DISTINCT reporter_id)
      FROM public.payment_reports 
      WHERE producer_id = COALESCE(NEW.producer_id, OLD.producer_id) 
        AND status != 'paid' 
        AND reporter_type = 'vendor'
    ),
    total_vendor_debt = (
      SELECT COALESCE(SUM(amount_owed), 0)
      FROM public.payment_reports 
      WHERE producer_id = COALESCE(NEW.producer_id, OLD.producer_id) 
        AND status != 'paid' 
        AND reporter_type = 'vendor'
    ),
    total_jobs_owed = (
      SELECT COUNT(DISTINCT project_name)
      FROM public.payment_reports 
      WHERE producer_id = COALESCE(NEW.producer_id, OLD.producer_id) AND status != 'paid'
    ),
    total_cities_owed = (
      SELECT COUNT(DISTINCT city)
      FROM public.payment_reports 
      WHERE producer_id = COALESCE(NEW.producer_id, OLD.producer_id) AND status != 'paid' AND city IS NOT NULL
    ),
    paid_jobs_count = (
      SELECT COUNT(DISTINCT project_name)
      FROM public.payment_reports 
      WHERE producer_id = COALESCE(NEW.producer_id, OLD.producer_id) AND status = 'paid'
    ),
    paid_crew_count = (
      SELECT COUNT(DISTINCT reporter_id)
      FROM public.payment_reports 
      WHERE producer_id = COALESCE(NEW.producer_id, OLD.producer_id) AND status = 'paid'
    ),
    last_closed_date = (
      SELECT MAX(closed_date)
      FROM public.payment_reports
      WHERE producer_id = COALESCE(NEW.producer_id, OLD.producer_id) AND status = 'paid'
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.producer_id, OLD.producer_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 5. Update PSCS calculation to include vendor penalties
CREATE OR REPLACE FUNCTION public.calculate_pscs_score(producer_uuid uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  -- Config values
  max_score NUMERIC;
  age_threshold NUMERIC;
  age_rate_early NUMERIC;
  age_base_late NUMERIC;
  age_rate_late NUMERIC;
  age_cap NUMERIC;
  amount_rate NUMERIC;
  amount_cap NUMERIC;
  crew_penalty NUMERIC;
  jobs_penalty NUMERIC;
  cities_penalty NUMERIC;
  vendor_multiplier NUMERIC;
  vendor_count_penalty NUMERIC;
  forgiveness_halflife NUMERIC;
  history_retention NUMERIC;
  
  -- Current debt metrics - CREW
  crew_total_owed NUMERIC;
  crew_longest_days INTEGER;
  unpaid_crew INTEGER;
  
  -- Current debt metrics - VENDOR
  vendor_total_owed NUMERIC;
  vendor_longest_days INTEGER;
  unpaid_vendors INTEGER;
  
  -- Shared metrics
  unpaid_jobs INTEGER;
  cities_with_debt INTEGER;
  
  -- Historical tracking
  paid_jobs INTEGER;
  last_payment_date DATE;
  days_since_last_payment INTEGER;
  
  -- Penalty components
  crew_age_penalty NUMERIC;
  crew_amount_penalty NUMERIC;
  vendor_age_penalty NUMERIC;
  vendor_amount_penalty NUMERIC;
  repeat_penalty NUMERIC;
  current_penalty NUMERIC;
  historical_penalty NUMERIC;
  forgiveness_factor NUMERIC;
  
  final_score NUMERIC;
BEGIN
  -- Load config
  SELECT value INTO max_score FROM pscs_config WHERE key = 'MAX_SCORE';
  SELECT value INTO age_threshold FROM pscs_config WHERE key = 'AGE_THRESHOLD_DAYS';
  SELECT value INTO age_rate_early FROM pscs_config WHERE key = 'AGE_PENALTY_RATE_EARLY';
  SELECT value INTO age_base_late FROM pscs_config WHERE key = 'AGE_PENALTY_BASE_LATE';
  SELECT value INTO age_rate_late FROM pscs_config WHERE key = 'AGE_PENALTY_RATE_LATE';
  SELECT value INTO age_cap FROM pscs_config WHERE key = 'AGE_PENALTY_CAP';
  SELECT value INTO amount_rate FROM pscs_config WHERE key = 'AMOUNT_PENALTY_RATE';
  SELECT value INTO amount_cap FROM pscs_config WHERE key = 'AMOUNT_PENALTY_CAP';
  SELECT value INTO crew_penalty FROM pscs_config WHERE key = 'REPEAT_CREW_PENALTY';
  SELECT value INTO jobs_penalty FROM pscs_config WHERE key = 'REPEAT_JOBS_PENALTY';
  SELECT value INTO cities_penalty FROM pscs_config WHERE key = 'REPEAT_CITIES_PENALTY';
  SELECT value INTO vendor_multiplier FROM pscs_config WHERE key = 'VENDOR_PENALTY_MULTIPLIER';
  SELECT value INTO vendor_count_penalty FROM pscs_config WHERE key = 'VENDOR_COUNT_PENALTY';
  SELECT value INTO forgiveness_halflife FROM pscs_config WHERE key = 'FORGIVENESS_HALFLIFE_DAYS';
  SELECT value INTO history_retention FROM pscs_config WHERE key = 'HISTORY_PENALTY_RETENTION';
  
  -- Get CREW debt metrics
  SELECT 
    COALESCE(SUM(CASE WHEN status != 'paid' AND reporter_type = 'crew' THEN amount_owed ELSE 0 END), 0),
    COALESCE(MAX(CASE WHEN status != 'paid' AND reporter_type = 'crew' THEN days_overdue ELSE 0 END), 0),
    COUNT(DISTINCT CASE WHEN status != 'paid' AND reporter_type = 'crew' THEN reporter_id END)
  INTO crew_total_owed, crew_longest_days, unpaid_crew
  FROM public.payment_reports
  WHERE producer_id = producer_uuid;
  
  -- Get VENDOR debt metrics
  SELECT 
    COALESCE(SUM(CASE WHEN status != 'paid' AND reporter_type = 'vendor' THEN amount_owed ELSE 0 END), 0),
    COALESCE(MAX(CASE WHEN status != 'paid' AND reporter_type = 'vendor' THEN days_overdue ELSE 0 END), 0),
    COUNT(DISTINCT CASE WHEN status != 'paid' AND reporter_type = 'vendor' THEN reporter_id END)
  INTO vendor_total_owed, vendor_longest_days, unpaid_vendors
  FROM public.payment_reports
  WHERE producer_id = producer_uuid;
  
  -- Get shared metrics
  SELECT 
    COUNT(DISTINCT CASE WHEN status != 'paid' THEN project_name END),
    COUNT(DISTINCT CASE WHEN status != 'paid' THEN city END)
  INTO unpaid_jobs, cities_with_debt
  FROM public.payment_reports
  WHERE producer_id = producer_uuid;
  
  -- Get payment history
  SELECT 
    COALESCE(paid_jobs_count, 0),
    last_closed_date
  INTO paid_jobs, last_payment_date
  FROM public.producers
  WHERE id = producer_uuid;
  
  -- Calculate CREW Age Penalty (piecewise linear with cap)
  IF crew_longest_days <= age_threshold THEN
    crew_age_penalty := LEAST(age_cap, age_rate_early * crew_longest_days);
  ELSE
    crew_age_penalty := LEAST(age_cap, age_base_late + age_rate_late * (crew_longest_days - age_threshold));
  END IF;
  
  -- Calculate CREW Amount Penalty (linear with cap)
  crew_amount_penalty := LEAST(amount_cap, amount_rate * crew_total_owed);
  
  -- Calculate VENDOR Age Penalty (same formula, but multiplied)
  IF vendor_longest_days <= age_threshold THEN
    vendor_age_penalty := LEAST(age_cap, vendor_multiplier * age_rate_early * vendor_longest_days);
  ELSE
    vendor_age_penalty := LEAST(age_cap, vendor_multiplier * (age_base_late + age_rate_late * (vendor_longest_days - age_threshold)));
  END IF;
  
  -- Calculate VENDOR Amount Penalty (same formula, but multiplied)
  vendor_amount_penalty := LEAST(amount_cap, vendor_multiplier * amount_rate * vendor_total_owed);
  
  -- Calculate Repeat Offender Penalty (count-based, no cap)
  repeat_penalty := GREATEST(0, 
    crew_penalty * (unpaid_crew - 1) + 
    vendor_count_penalty * (unpaid_vendors - 1) +
    jobs_penalty * (unpaid_jobs - 1) + 
    cities_penalty * (cities_with_debt - 1)
  );
  
  current_penalty := crew_age_penalty + crew_amount_penalty + vendor_age_penalty + vendor_amount_penalty + repeat_penalty;
  
  -- If producer has NO current debt but HAS payment history, apply forgiveness
  IF (crew_total_owed + vendor_total_owed) = 0 AND paid_jobs > 0 AND last_payment_date IS NOT NULL THEN
    days_since_last_payment := (CURRENT_DATE - last_payment_date);
    historical_penalty := history_retention * max_score;
    forgiveness_factor := 1 - EXP(-days_since_last_payment / forgiveness_halflife * 0.693147);
    final_score := max_score - (historical_penalty * (1 - forgiveness_factor));
  ELSE
    final_score := max_score - current_penalty;
  END IF;
  
  -- Ensure score stays within bounds
  RETURN GREATEST(0, LEAST(max_score, ROUND(final_score, 0)));
END;
$function$;