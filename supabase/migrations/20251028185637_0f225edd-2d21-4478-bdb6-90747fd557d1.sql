-- ============================================================================
-- PSCS™ Fairness System - Complete Implementation (Fixed)
-- ============================================================================

-- Step 1: Create past_debts table for historical tracking
CREATE TABLE IF NOT EXISTS public.past_debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  amount_owed numeric NOT NULL,
  days_overdue integer NOT NULL,
  reporter_type text NOT NULL DEFAULT 'crew',
  total_reports_at_time integer NOT NULL DEFAULT 1,
  date_resolved date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_past_debts_producer ON past_debts(producer_id);
CREATE INDEX IF NOT EXISTS idx_past_debts_date_resolved ON past_debts(date_resolved);
CREATE INDEX IF NOT EXISTS idx_past_debts_reporter_type ON past_debts(reporter_type);

-- Enable RLS
ALTER TABLE public.past_debts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view own past debts"
  ON public.past_debts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM producer_account_links 
      WHERE producer_id = past_debts.producer_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all past debts"
  ON public.past_debts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert past debts"
  ON public.past_debts FOR INSERT
  WITH CHECK (true);

-- Step 2: Create trigger to log resolved debts
CREATE OR REPLACE FUNCTION public.log_past_debt_on_resolve()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
BEGIN
  -- Only log when transitioning from unpaid → paid
  IF (OLD.status != 'paid' AND NEW.status = 'paid') THEN
    INSERT INTO past_debts (
      producer_id, 
      amount_owed, 
      days_overdue, 
      reporter_type,
      total_reports_at_time
    )
    VALUES (
      NEW.producer_id,
      OLD.amount_owed,
      OLD.days_overdue,
      COALESCE(OLD.reporter_type, 'crew'),
      (SELECT COUNT(*) FROM payment_reports WHERE producer_id = NEW.producer_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_past_debt_on_resolve
  AFTER UPDATE ON payment_reports
  FOR EACH ROW 
  EXECUTE FUNCTION log_past_debt_on_resolve();

-- Step 3: Replace PSCS calculation function with history-aware version
CREATE OR REPLACE FUNCTION public.calculate_pscs_score(producer_uuid uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Historical penalties (NEW)
  crew_history_penalty NUMERIC := 0;
  vendor_history_penalty NUMERIC := 0;
  crew_ratio_penalty NUMERIC := 0;
  vendor_ratio_penalty NUMERIC := 0;
  
  -- Penalty components
  crew_age_penalty NUMERIC;
  crew_amount_penalty NUMERIC;
  vendor_age_penalty NUMERIC;
  vendor_amount_penalty NUMERIC;
  repeat_penalty NUMERIC;
  current_penalty NUMERIC;
  total_history_penalty NUMERIC;
  
  final_score NUMERIC;
  
  total_reports INTEGER;
  past_crew_count INTEGER;
  past_vendor_count INTEGER;
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
  
  -- Get total reports for this producer
  SELECT COUNT(*) INTO total_reports 
  FROM payment_reports 
  WHERE producer_id = producer_uuid;
  
  -- Prevent division by zero
  IF total_reports = 0 THEN
    total_reports := 1;
  END IF;
  
  -- Get CREW debt metrics (current/active debts)
  SELECT 
    COALESCE(SUM(CASE WHEN status != 'paid' AND reporter_type = 'crew' THEN amount_owed ELSE 0 END), 0),
    COALESCE(MAX(CASE WHEN status != 'paid' AND reporter_type = 'crew' THEN days_overdue ELSE 0 END), 0),
    COUNT(DISTINCT CASE WHEN status != 'paid' AND reporter_type = 'crew' THEN reporter_id END)
  INTO crew_total_owed, crew_longest_days, unpaid_crew
  FROM payment_reports
  WHERE producer_id = producer_uuid;
  
  -- Get VENDOR debt metrics (current/active debts)
  SELECT 
    COALESCE(SUM(CASE WHEN status != 'paid' AND reporter_type = 'vendor' THEN amount_owed ELSE 0 END), 0),
    COALESCE(MAX(CASE WHEN status != 'paid' AND reporter_type = 'vendor' THEN days_overdue ELSE 0 END), 0),
    COUNT(DISTINCT CASE WHEN status != 'paid' AND reporter_type = 'vendor' THEN reporter_id END)
  INTO vendor_total_owed, vendor_longest_days, unpaid_vendors
  FROM payment_reports
  WHERE producer_id = producer_uuid;
  
  -- Get shared metrics
  SELECT 
    COUNT(DISTINCT CASE WHEN status != 'paid' THEN project_name END),
    COUNT(DISTINCT CASE WHEN status != 'paid' THEN city END)
  INTO unpaid_jobs, cities_with_debt
  FROM payment_reports
  WHERE producer_id = producer_uuid;
  
  -- === NEW: Calculate CREW History Penalty (time-decayed) ===
  -- Using direct date arithmetic: (CURRENT_DATE - date_resolved) returns integer days
  SELECT 
    COALESCE(
      SUM(
        250 * (1 - EXP(-(((CURRENT_DATE - date_resolved)::numeric / forgiveness_halflife) * 0.693147)))
      ) / GREATEST(AVG(total_reports_at_time), 1),
      0
    ),
    COUNT(*)
  INTO crew_history_penalty, past_crew_count
  FROM past_debts
  WHERE producer_id = producer_uuid 
    AND reporter_type = 'crew'
    AND date_resolved > CURRENT_DATE - INTERVAL '3 years';
  
  -- === NEW: Calculate VENDOR History Penalty (time-decayed, heavier) ===
  SELECT 
    COALESCE(
      SUM(
        (250 * vendor_multiplier) * (1 - EXP(-(((CURRENT_DATE - date_resolved)::numeric / forgiveness_halflife) * 0.693147)))
      ) / GREATEST(AVG(total_reports_at_time), 1),
      0
    ),
    COUNT(*)
  INTO vendor_history_penalty, past_vendor_count
  FROM past_debts
  WHERE producer_id = producer_uuid 
    AND reporter_type = 'vendor'
    AND date_resolved > CURRENT_DATE - INTERVAL '3 years';
  
  -- === NEW: Calculate CREW Delinquency Ratio Penalty ===
  IF past_crew_count > 0 THEN
    crew_ratio_penalty := (past_crew_count::NUMERIC / NULLIF(total_reports, 0)) * 150;
  END IF;
  
  -- === NEW: Calculate VENDOR Delinquency Ratio Penalty ===
  IF past_vendor_count > 0 THEN
    vendor_ratio_penalty := (past_vendor_count::NUMERIC / NULLIF(total_reports, 0)) * (150 * vendor_multiplier);
  END IF;
  
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
  
  -- Combine all penalties
  current_penalty := crew_age_penalty + crew_amount_penalty + vendor_age_penalty + vendor_amount_penalty + repeat_penalty;
  total_history_penalty := crew_history_penalty + vendor_history_penalty + crew_ratio_penalty + vendor_ratio_penalty;
  
  final_score := max_score - current_penalty - total_history_penalty;
  
  -- Ensure score stays within bounds
  RETURN GREATEST(0, LEAST(max_score, ROUND(final_score, 0)));
END;
$$;

-- Step 4: Create cleanup function for old debts
CREATE OR REPLACE FUNCTION public.cleanup_old_past_debts()
RETURNS void 
LANGUAGE sql 
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM past_debts 
  WHERE date_resolved < CURRENT_DATE - INTERVAL '3 years';
$$;

-- Step 5: Enable pg_cron extension and schedule daily cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing schedule if it exists
SELECT cron.unschedule('cleanup-old-past-debts') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-past-debts'
);

-- Schedule cleanup to run daily at 2 AM UTC
SELECT cron.schedule(
  'cleanup-old-past-debts',
  '0 2 * * *',
  $$SELECT cleanup_old_past_debts();$$
);

-- Step 6: Backfill existing paid reports into past_debts
INSERT INTO past_debts (producer_id, amount_owed, days_overdue, reporter_type, total_reports_at_time, date_resolved)
SELECT 
  producer_id,
  amount_owed,
  days_overdue,
  COALESCE(reporter_type, 'crew'),
  (SELECT COUNT(*) FROM payment_reports pr2 WHERE pr2.producer_id = pr.producer_id),
  COALESCE(closed_date, payment_date, updated_at::date)
FROM payment_reports pr
WHERE status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM past_debts pd 
    WHERE pd.producer_id = pr.producer_id 
      AND pd.amount_owed = pr.amount_owed
      AND pd.date_resolved = COALESCE(pr.closed_date, pr.payment_date, pr.updated_at::date)
  );

-- Step 7: Recalculate all producer scores with new history-aware formula
UPDATE producers SET pscs_score = calculate_pscs_score(id);