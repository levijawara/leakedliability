-- Add PSCS score and detailed tracking fields to producers table
ALTER TABLE public.producers
ADD COLUMN IF NOT EXISTS pscs_score numeric DEFAULT 1000,
ADD COLUMN IF NOT EXISTS total_amount_owed numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS oldest_debt_date date,
ADD COLUMN IF NOT EXISTS oldest_debt_days integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_crew_owed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_jobs_owed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cities_owed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_jobs_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_crew_count integer DEFAULT 0;

-- Add city tracking to payment_reports
ALTER TABLE public.payment_reports
ADD COLUMN IF NOT EXISTS city text;

-- Create payment confirmations table
CREATE TABLE IF NOT EXISTS public.payment_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_report_id uuid REFERENCES public.payment_reports(id) ON DELETE CASCADE,
  producer_id uuid REFERENCES public.producers(id) ON DELETE CASCADE,
  confirmer_id uuid NOT NULL,
  confirmation_type text NOT NULL CHECK (confirmation_type IN ('crew_confirmation', 'producer_documentation')),
  amount_paid numeric NOT NULL,
  payment_proof_url text,
  notes text,
  verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.payment_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verified confirmations"
ON public.payment_confirmations FOR SELECT
USING (verified = true);

CREATE POLICY "Authenticated users can create confirmations"
ON public.payment_confirmations FOR INSERT
WITH CHECK (auth.uid() = confirmer_id);

CREATE POLICY "Users can view their own confirmations"
ON public.payment_confirmations FOR SELECT
USING (auth.uid() = confirmer_id);

-- Create disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_report_id uuid REFERENCES public.payment_reports(id) ON DELETE CASCADE,
  disputer_id uuid NOT NULL,
  dispute_type text NOT NULL CHECK (dispute_type IN ('producer_dispute', 'crew_counter_dispute')),
  explanation text NOT NULL,
  evidence_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'rejected')),
  resolution_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view disputes"
ON public.disputes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create disputes"
ON public.disputes FOR INSERT
WITH CHECK (auth.uid() = disputer_id);

CREATE POLICY "Users can view their own disputes"
ON public.disputes FOR SELECT
USING (auth.uid() = disputer_id);

-- Create function to calculate PSCS score
CREATE OR REPLACE FUNCTION public.calculate_pscs_score(producer_uuid uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alpha constant numeric := 0.5;
  total_owed numeric;
  unpaid_jobs integer;
  total_jobs integer;
  unpaid_crew integer;
  total_crew integer;
  longest_days integer;
  cities_with_debt integer;
  total_cities integer;
  f_money numeric;
  f_jobs numeric;
  f_crew numeric;
  f_age numeric;
  f_geo numeric;
  pscs numeric;
  a_star numeric := 100000; -- $100k default cap
  d_star numeric := 365; -- 365 days default
BEGIN
  -- Get totals from payment_reports
  SELECT 
    COALESCE(SUM(CASE WHEN status != 'paid' THEN amount_owed ELSE 0 END), 0),
    COUNT(DISTINCT CASE WHEN status != 'paid' THEN project_name END),
    COUNT(DISTINCT project_name),
    COUNT(DISTINCT CASE WHEN status != 'paid' THEN reporter_id END),
    COUNT(DISTINCT reporter_id),
    COALESCE(MAX(CASE WHEN status != 'paid' THEN days_overdue ELSE 0 END), 0),
    COUNT(DISTINCT CASE WHEN status != 'paid' THEN city END),
    COUNT(DISTINCT city)
  INTO total_owed, unpaid_jobs, total_jobs, unpaid_crew, total_crew, longest_days, cities_with_debt, total_cities
  FROM public.payment_reports
  WHERE producer_id = producer_uuid;
  
  -- Calculate F_$ (amount owed with adaptive cap)
  f_money := LEAST(1, LN(1 + total_owed) / LN(1 + a_star));
  
  -- Calculate F_jobs (unpaid jobs ratio)
  f_jobs := (unpaid_jobs + alpha) / ((total_jobs) + 2 * alpha);
  
  -- Calculate F_crew (unpaid crew ratio)
  f_crew := (unpaid_crew + alpha) / ((total_crew) + 2 * alpha);
  
  -- Calculate F_age (longest debt age)
  f_age := LEAST(1, longest_days / d_star);
  
  -- Calculate F_geo (geographic spread)
  f_geo := (cities_with_debt + alpha) / ((total_cities) + 2 * alpha);
  
  -- Calculate final PSCS
  pscs := 1000 * (1 - (0.35 * f_money + 0.20 * f_jobs + 0.20 * f_crew + 0.15 * f_age + 0.10 * f_geo));
  
  RETURN GREATEST(0, LEAST(1000, pscs));
END;
$$;

-- Create trigger to update producer stats when reports change
CREATE OR REPLACE FUNCTION public.update_producer_stats_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    updated_at = now()
  WHERE id = COALESCE(NEW.producer_id, OLD.producer_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS update_producer_stats_trigger ON public.payment_reports;
CREATE TRIGGER update_producer_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.payment_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_producer_stats_complete();

-- Add trigger for updated_at on new tables
CREATE TRIGGER update_payment_confirmations_updated_at
BEFORE UPDATE ON public.payment_confirmations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();