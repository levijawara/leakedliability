-- Clear old PSCS config and insert new simplified config
DELETE FROM pscs_config;

INSERT INTO pscs_config (key, value, description) VALUES
  ('MAX_SCORE', 1000, 'Maximum possible PSCS score'),
  ('AGE_THRESHOLD_DAYS', 60, 'Days threshold for age penalty calculation change'),
  ('AGE_PENALTY_RATE_EARLY', 8, 'Penalty per day for debts <= 60 days old'),
  ('AGE_PENALTY_BASE_LATE', 300, 'Base penalty after 60 days'),
  ('AGE_PENALTY_RATE_LATE', 1.5, 'Additional penalty per day after 60 days'),
  ('AGE_PENALTY_CAP', 650, 'Maximum age penalty'),
  ('AMOUNT_PENALTY_RATE', 0.15, 'Penalty per dollar owed'),
  ('AMOUNT_PENALTY_CAP', 300, 'Maximum amount penalty'),
  ('REPEAT_CREW_PENALTY', 80, 'Penalty per additional crew member owed'),
  ('REPEAT_JOBS_PENALTY', 60, 'Penalty per additional job owed'),
  ('REPEAT_CITIES_PENALTY', 40, 'Penalty per additional city owed');

-- Replace the PSCS calculation function with Google Sheets formula logic
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
  
  -- Current debt metrics
  total_owed NUMERIC;
  unpaid_jobs INTEGER;
  unpaid_crew INTEGER;
  longest_days INTEGER;
  cities_with_debt INTEGER;
  
  -- Penalty components
  age_penalty NUMERIC;
  amount_penalty NUMERIC;
  repeat_penalty NUMERIC;
  
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
  
  -- Final score calculation
  final_score := max_score - (age_penalty + amount_penalty + repeat_penalty);
  
  -- Ensure score stays within bounds
  RETURN GREATEST(0, LEAST(max_score, ROUND(final_score, 0)));
END;
$function$;

-- Recalculate all producer scores with new formula
UPDATE producers
SET pscs_score = calculate_pscs_score(id);