-- 🔥 Good Standing Momentum
ALTER TABLE public.producers
  ADD COLUMN IF NOT EXISTS momentum_active_until TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.update_good_standing_momentum()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.pscs_score > OLD.pscs_score THEN
    NEW.momentum_active_until := NOW() + interval '7 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_momentum ON public.producers;
CREATE TRIGGER trg_update_momentum
AFTER UPDATE OF pscs_score ON public.producers
FOR EACH ROW
WHEN (NEW.pscs_score IS DISTINCT FROM OLD.pscs_score)
EXECUTE FUNCTION public.update_good_standing_momentum();

-- 🧾 Producer Self-Reports
CREATE TABLE IF NOT EXISTS public.producer_self_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  project_title TEXT NOT NULL,
  amount_owed NUMERIC(10,2) NOT NULL,
  reason TEXT,
  evidence_url TEXT,
  corroboration_count INT DEFAULT 0,
  status TEXT DEFAULT 'unverified'
    CHECK (status IN ('unverified','pending_verification','verified','resolved','expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '30 days'
);

COMMENT ON TABLE public.producer_self_reports IS
'Producers can self-report debts to gain transparency credit. Requires 3 corroborations to verify.';

-- Enable RLS
ALTER TABLE public.producer_self_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Producers can insert their own self-reports"
ON public.producer_self_reports
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.producer_account_links
    WHERE producer_id = producer_self_reports.producer_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Producers can view their own self-reports"
ON public.producer_self_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.producer_account_links
    WHERE producer_id = producer_self_reports.producer_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all self-reports"
ON public.producer_self_reports
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for auto-verification
CREATE OR REPLACE FUNCTION public.verify_self_report()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.corroboration_count >= 3 AND OLD.status = 'unverified' THEN
    NEW.status := 'pending_verification';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verify_self_report ON public.producer_self_reports;
CREATE TRIGGER trg_verify_self_report
BEFORE UPDATE OF corroboration_count ON public.producer_self_reports
FOR EACH ROW
EXECUTE FUNCTION public.verify_self_report();