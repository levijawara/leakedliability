-- Remove the 0-floor clamp from PSCS calculation to allow negative scores

CREATE OR REPLACE FUNCTION public.calculate_pscs_score(producer_uuid uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  -- Grace period: prevent very short delays from immediately tanking score
  GRACE_DAYS CONSTANT INTEGER := 3;
  
  -- Recovery variables
  days_clean INTEGER := 0;
  unpaid_report_count INTEGER := 0;
  recovery_base NUMERIC := 700;
  recovery_max NUMERIC := 1000;
  recovery_days NUMERIC := 30;
  recovery_ratio NUMERIC;
  
  -- Plateau tracking
  stored_score NUMERIC;
  current_plateau_days INTEGER;
  
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
  -- Check if producer has ANY unpaid debts
  SELECT COUNT(*) INTO unpaid_report_count
  FROM payment_reports
  WHERE producer_id = producer_uuid AND status != 'paid';
  
  -- If producer has zero unpaid debts, apply recovery formula
  IF unpaid_report_count = 0 THEN
    SELECT 
      COALESCE(CURRENT_DATE - last_closed_date, 0)
    INTO days_clean
    FROM producers
    WHERE id = producer_uuid;
    
    IF days_clean IS NULL THEN
      days_clean := 0;
    END IF;
    
    recovery_ratio := LEAST(days_clean::NUMERIC / recovery_days, 1.0);
    
    RETURN ROUND(recovery_base + (recovery_max - recovery_base) * recovery_ratio, 0);
  END IF;
  
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
  
  SELECT COUNT(*) INTO total_reports 
  FROM payment_reports 
  WHERE producer_id = producer_uuid;
  
  IF total_reports = 0 THEN
    total_reports := 1;
  END IF;
  
  -- Get CREW debt metrics with 3-day grace period applied
  SELECT 
    COALESCE(SUM(CASE WHEN status != 'paid' AND reporter_type = 'crew' THEN amount_owed ELSE 0 END), 0),
    COALESCE(MAX(CASE WHEN status != 'paid' AND reporter_type = 'crew' 
                      THEN GREATEST(days_overdue - GRACE_DAYS, 0) 
                      ELSE 0 END), 0),
    COUNT(DISTINCT CASE WHEN status != 'paid' AND reporter_type = 'crew' THEN reporter_id END)
  INTO crew_total_owed, crew_longest_days, unpaid_crew
  FROM payment_reports
  WHERE producer_id = producer_uuid;
  
  -- Get VENDOR debt metrics with 3-day grace period applied
  SELECT 
    COALESCE(SUM(CASE WHEN status != 'paid' AND reporter_type = 'vendor' THEN amount_owed ELSE 0 END), 0),
    COALESCE(MAX(CASE WHEN status != 'paid' AND reporter_type = 'vendor' 
                      THEN GREATEST(days_overdue - GRACE_DAYS, 0) 
                      ELSE 0 END), 0),
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
  
  -- Calculate CREW History Penalty
  SELECT 
    COALESCE(
      SUM(
        CASE
          WHEN (CURRENT_DATE - date_resolved) >= 30 THEN 0
          ELSE 250 * (1 - ((CURRENT_DATE - date_resolved)::numeric / 30))
        END
      ) / GREATEST(AVG(total_reports_at_time), 1),
      0
    ),
    COUNT(*)
  INTO crew_history_penalty, past_crew_count
  FROM past_debts
  WHERE producer_id = producer_uuid 
    AND reporter_type = 'crew'
    AND date_resolved > CURRENT_DATE - INTERVAL '3 years';
  
  -- Calculate VENDOR History Penalty
  SELECT 
    COALESCE(
      SUM(
        CASE
          WHEN (CURRENT_DATE - date_resolved) >= 30 THEN 0
          ELSE (250 * vendor_multiplier) * (1 - ((CURRENT_DATE - date_resolved)::numeric / 30))
        END
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
  IF past_crew_count > 2 THEN
    crew_ratio_penalty := (past_crew_count::NUMERIC / NULLIF(total_reports, 0)) * 150;
  ELSIF past_crew_count > 0 THEN
    crew_ratio_penalty := (past_crew_count::NUMERIC / NULLIF(total_reports, 0)) * 50;
  END IF;
  
  -- Calculate VENDOR Delinquency Ratio Penalty
  IF past_vendor_count > 2 THEN
    vendor_ratio_penalty := (past_vendor_count::NUMERIC / NULLIF(total_reports, 0)) * (150 * vendor_multiplier);
  ELSIF past_vendor_count > 0 THEN
    vendor_ratio_penalty := (past_vendor_count::NUMERIC / NULLIF(total_reports, 0)) * (50 * vendor_multiplier);
  END IF;
  
  -- Calculate CREW Age Penalty (NO CAP)
  IF crew_longest_days <= age_threshold THEN
    crew_age_penalty := age_rate_early * crew_longest_days;
  ELSE
    crew_age_penalty := age_base_late + age_rate_late * (crew_longest_days - age_threshold);
  END IF;
  
  -- Calculate CREW Amount Penalty
  crew_amount_penalty := LEAST(amount_cap, amount_rate * crew_total_owed);
  
  -- Calculate VENDOR Age Penalty (NO CAP)
  IF vendor_longest_days <= age_threshold THEN
    vendor_age_penalty := vendor_multiplier * age_rate_early * vendor_longest_days;
  ELSE
    vendor_age_penalty := vendor_multiplier * (age_base_late + age_rate_late * (vendor_longest_days - age_threshold));
  END IF;
  
  -- Calculate VENDOR Amount Penalty
  vendor_amount_penalty := LEAST(amount_cap, vendor_multiplier * amount_rate * vendor_total_owed);
  
  -- Calculate Repeat Offender Penalty
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
  
  -- Plateau detection: Fetch current score and plateau_days
  SELECT pscs_score, COALESCE(plateau_days, 0) 
  INTO stored_score, current_plateau_days
  FROM producers 
  WHERE id = producer_uuid;
  
  -- If the rounded score matches the stored score, apply plateau penalty
  IF ROUND(final_score, 0) = ROUND(stored_score, 0) THEN
    current_plateau_days := current_plateau_days + 1;
    final_score := final_score - (0.25 * current_plateau_days);
  ELSE
    current_plateau_days := 0;
  END IF;
  
  -- Remove the 0 floor clamp, keep only upper bound at 1000
  final_score := LEAST(max_score, ROUND(final_score, 2));
  
  RETURN final_score;
END;
$function$;