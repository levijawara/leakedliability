-- Phase 1: Create config table for tunable parameters
CREATE TABLE IF NOT EXISTS public.pscs_config (
  key TEXT PRIMARY KEY,
  value NUMERIC NOT NULL,
  description TEXT
);

-- Insert configuration values
INSERT INTO public.pscs_config (key, value, description) VALUES
  ('MAX_SCORE', 1000, 'Maximum possible PSCS score'),
  ('AMOUNT_SCALE', 5000, 'Dollar amount that equals 100% penalty'),
  ('DAYS_SCALE', 180, 'Number of days that equals 100% age penalty'),
  ('CREW_SCALE', 5, 'Number of crew members that equals 100% penalty'),
  ('JOBS_SCALE', 5, 'Number of jobs that equals 100% penalty'),
  ('CITIES_SCALE', 3, 'Number of cities that equals 100% penalty'),
  ('W_AMOUNT', 0.35, 'Weight for dollar amount penalty'),
  ('W_DAYS', 0.35, 'Weight for age of debt penalty'),
  ('W_CREW', 0.10, 'Weight for crew spread penalty'),
  ('W_JOBS', 0.10, 'Weight for job spread penalty'),
  ('W_CITIES', 0.10, 'Weight for geographic spread penalty'),
  ('TAU_DAYS', 90, 'Forgiveness time constant in days')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS on config table (read-only for everyone)
ALTER TABLE public.pscs_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view PSCS config"
  ON public.pscs_config
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify PSCS config"
  ON public.pscs_config
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Phase 2: Add tracking columns
ALTER TABLE public.payment_reports 
  ADD COLUMN IF NOT EXISTS closed_date DATE;

ALTER TABLE public.producers 
  ADD COLUMN IF NOT EXISTS last_closed_date DATE;

-- Backfill closed_date for existing paid reports
UPDATE public.payment_reports 
SET closed_date = COALESCE(payment_date, updated_at::date)
WHERE status = 'paid' AND closed_date IS NULL;

-- Phase 3: Replace PSCS calculation with rolling formula
CREATE OR REPLACE FUNCTION public.calculate_pscs_score(producer_uuid uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- Config values
  max_score NUMERIC;
  amount_scale NUMERIC;
  days_scale NUMERIC;
  crew_scale NUMERIC;
  jobs_scale NUMERIC;
  cities_scale NUMERIC;
  w_amount NUMERIC;
  w_days NUMERIC;
  w_crew NUMERIC;
  w_jobs NUMERIC;
  w_cities NUMERIC;
  tau_days NUMERIC;
  
  -- Current debt metrics
  total_owed NUMERIC;
  unpaid_jobs INTEGER;
  unpaid_crew INTEGER;
  longest_days INTEGER;
  cities_with_debt INTEGER;
  
  -- Penalty factors
  f_money NUMERIC;
  f_days NUMERIC;
  f_crew NUMERIC;
  f_jobs NUMERIC;
  f_geo NUMERIC;
  
  -- Score components
  weighted_penalty NUMERIC;
  base_score NUMERIC;
  
  -- Forgiveness tracking
  last_closed DATE;
  days_clean INTEGER;
  forgiveness NUMERIC;
  
  final_score NUMERIC;
BEGIN
  -- Load config values
  SELECT value INTO max_score FROM pscs_config WHERE key = 'MAX_SCORE';
  SELECT value INTO amount_scale FROM pscs_config WHERE key = 'AMOUNT_SCALE';
  SELECT value INTO days_scale FROM pscs_config WHERE key = 'DAYS_SCALE';
  SELECT value INTO crew_scale FROM pscs_config WHERE key = 'CREW_SCALE';
  SELECT value INTO jobs_scale FROM pscs_config WHERE key = 'JOBS_SCALE';
  SELECT value INTO cities_scale FROM pscs_config WHERE key = 'CITIES_SCALE';
  SELECT value INTO w_amount FROM pscs_config WHERE key = 'W_AMOUNT';
  SELECT value INTO w_days FROM pscs_config WHERE key = 'W_DAYS';
  SELECT value INTO w_crew FROM pscs_config WHERE key = 'W_CREW';
  SELECT value INTO w_jobs FROM pscs_config WHERE key = 'W_JOBS';
  SELECT value INTO w_cities FROM pscs_config WHERE key = 'W_CITIES';
  SELECT value INTO tau_days FROM pscs_config WHERE key = 'TAU_DAYS';
  
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
  
  -- Calculate penalty factors (0 to 1)
  f_money := LEAST(1, total_owed / amount_scale);
  f_days := LEAST(1, longest_days::NUMERIC / days_scale);
  f_crew := LEAST(1, unpaid_crew::NUMERIC / crew_scale);
  f_jobs := LEAST(1, unpaid_jobs::NUMERIC / jobs_scale);
  f_geo := LEAST(1, cities_with_debt::NUMERIC / cities_scale);
  
  -- Calculate weighted penalty
  weighted_penalty := (w_amount * f_money) + 
                      (w_days * f_days) + 
                      (w_crew * f_crew) + 
                      (w_jobs * f_jobs) + 
                      (w_cities * f_geo);
  
  -- Base score (before forgiveness)
  base_score := max_score * (1 - weighted_penalty);
  
  -- Apply forgiveness if no open debts
  IF total_owed = 0 THEN
    -- Get most recent closed date
    SELECT MAX(closed_date) INTO last_closed
    FROM public.payment_reports
    WHERE producer_id = producer_uuid AND status = 'paid';
    
    IF last_closed IS NOT NULL THEN
      days_clean := CURRENT_DATE - last_closed;
      -- Exponential decay forgiveness: (1 - e^(-days_clean/tau)) * (max - base)
      forgiveness := (1 - EXP(-days_clean::NUMERIC / tau_days)) * (max_score - base_score);
      final_score := base_score + forgiveness;
    ELSE
      final_score := max_score; -- Never had debt
    END IF;
  ELSE
    final_score := base_score; -- Has open debt, no forgiveness
  END IF;
  
  RETURN GREATEST(0, LEAST(max_score, ROUND(final_score, 0)));
END;
$function$;

-- Phase 4: Update trigger to auto-populate closed_date and last_closed_date
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
      WHERE producer_id = COALESCE(NEW.producer_id, OLD.producer_id) AND status != 'paid'
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