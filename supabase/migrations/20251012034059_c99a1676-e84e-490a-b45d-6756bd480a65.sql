-- Add forgiveness configuration
INSERT INTO pscs_config (key, value, description) VALUES
  ('FORGIVENESS_HALFLIFE_DAYS', 180, 'Days for forgiveness to reach 50% (exponential decay)'),
  ('HISTORY_PENALTY_RETENTION', 0.25, 'Percentage of original penalty retained as "history"')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

-- Update calculate_pscs_score to include time-based forgiveness
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
  forgiveness_halflife NUMERIC;
  history_retention NUMERIC;
  
  -- Current debt metrics
  total_owed NUMERIC;
  unpaid_jobs INTEGER;
  unpaid_crew INTEGER;
  longest_days INTEGER;
  cities_with_debt INTEGER;
  
  -- Historical tracking
  paid_jobs INTEGER;
  last_payment_date DATE;
  days_since_last_payment INTEGER;
  
  -- Penalty components
  age_penalty NUMERIC;
  amount_penalty NUMERIC;
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
  SELECT value INTO forgiveness_halflife FROM pscs_config WHERE key = 'FORGIVENESS_HALFLIFE_DAYS';
  SELECT value INTO history_retention FROM pscs_config WHERE key = 'HISTORY_PENALTY_RETENTION';
  
  -- Get current open debt metrics
  SELECT 
    COALESCE(SUM(CASE WHEN status != 'paid' THEN amount_owed ELSE 0 END), 0),
    COUNT(DISTINCT CASE WHEN status != 'paid' THEN project_name END),
    COUNT(DISTINCT CASE WHEN status != 'paid' THEN reporter_id END),
    COALESCE(MAX(CASE WHEN status != 'paid' THEN days_overdue ELSE 0 END), 0),
    COUNT(DISTINCT CASE WHEN status != 'paid' THEN city END)
  INTO total_owed, unpaid_jobs, unpaid_crew, longest_days, cities_with_debt
  FROM public.payment_reports
  WHERE producer_id = producer_uuid;
  
  -- Get payment history
  SELECT 
    COALESCE(paid_jobs_count, 0),
    last_closed_date
  INTO paid_jobs, last_payment_date
  FROM public.producers
  WHERE id = producer_uuid;
  
  -- Calculate Age Penalty (piecewise linear with cap)
  IF longest_days <= age_threshold THEN
    age_penalty := LEAST(age_cap, age_rate_early * longest_days);
  ELSE
    age_penalty := LEAST(age_cap, age_base_late + age_rate_late * (longest_days - age_threshold));
  END IF;
  
  -- Calculate Amount Penalty (linear with cap)
  amount_penalty := LEAST(amount_cap, amount_rate * total_owed);
  
  -- Calculate Repeat Offender Penalty (count-based, no cap)
  repeat_penalty := GREATEST(0, 
    crew_penalty * (unpaid_crew - 1) + 
    jobs_penalty * (unpaid_jobs - 1) + 
    cities_penalty * (cities_with_debt - 1)
  );
  
  current_penalty := age_penalty + amount_penalty + repeat_penalty;
  
  -- If producer has NO current debt but HAS payment history, apply forgiveness
  IF total_owed = 0 AND paid_jobs > 0 AND last_payment_date IS NOT NULL THEN
    -- Calculate how long they've been "clean"
    days_since_last_payment := (CURRENT_DATE - last_payment_date);
    
    -- Historical penalty is 25% of max score (represents the "damage" done)
    historical_penalty := history_retention * max_score;
    
    -- Apply exponential forgiveness: factor approaches 1 as time passes
    -- Formula: 1 - exp(-days / halflife * ln(2))
    forgiveness_factor := 1 - EXP(-days_since_last_payment / forgiveness_halflife * 0.693147);
    
    -- Reduce historical penalty by forgiveness factor
    final_score := max_score - (historical_penalty * (1 - forgiveness_factor));
  ELSE
    -- Producer still has debt: use current penalty only
    final_score := max_score - current_penalty;
  END IF;
  
  -- Ensure score stays within bounds
  RETURN GREATEST(0, LEAST(max_score, ROUND(final_score, 0)));
END;
$function$;