-- Fix PSCS forgiveness curve inversion
-- Change history penalties to decay over time (reward lasting credit)
-- instead of growing over time (punish clean behavior)

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
  
  -- Historical penalties
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
  
  -- Calculate CREW History Penalty (FIXED: decays over time)
  SELECT 
    COALESCE(
      SUM(
        250 * EXP(-(((CURRENT_DATE - date_resolved)::numeric / forgiveness_halflife) * 0.693147))
      ) / GREATEST(AVG(total_reports_at_time), 1),
      0
    ),
    COUNT(*)
  INTO crew_history_penalty, past_crew_count
  FROM past_debts
  WHERE producer_id = producer_uuid 
    AND reporter_type = 'crew'
    AND date_resolved > CURRENT_DATE - INTERVAL '3 years';
  
  -- Calculate VENDOR History Penalty (FIXED: decays over time, heavier)
  SELECT 
    COALESCE(
      SUM(
        (250 * vendor_multiplier) * EXP(-(((CURRENT_DATE - date_resolved)::numeric / forgiveness_halflife) * 0.693147))
      ) / GREATEST(AVG(total_reports_at_time), 1),
      0
    ),
    COUNT(*)
  INTO vendor_history_penalty, past_vendor_count
  FROM past_debts
  WHERE producer_id = producer_uuid 
    AND reporter_type = 'vendor'
    AND date_resolved > CURRENT_DATE - INTERVAL '3 years';
  
  -- Calculate CREW Delinquency Ratio Penalty
  IF past_crew_count > 0 THEN
    crew_ratio_penalty := (past_crew_count::NUMERIC / NULLIF(total_reports, 0)) * 150;
  END IF;
  
  -- Calculate VENDOR Delinquency Ratio Penalty
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
$function$;

-- Recalculate all producer scores with corrected formula
UPDATE producers SET pscs_score = calculate_pscs_score(id);