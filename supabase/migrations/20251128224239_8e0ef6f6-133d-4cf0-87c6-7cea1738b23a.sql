-- Create liability_redirects audit table
CREATE TABLE public.liability_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES payment_reports(id),
  original_report_id TEXT NOT NULL,
  from_producer_id UUID NOT NULL,
  from_producer_name TEXT NOT NULL,
  from_producer_email TEXT,
  to_producer_id UUID NOT NULL,
  to_producer_name TEXT NOT NULL,
  to_producer_email TEXT,
  performed_by UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.liability_redirects ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can view all redirects"
ON public.liability_redirects
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert redirects"
ON public.liability_redirects
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_liability_redirects_report_id ON public.liability_redirects(report_id);
CREATE INDEX idx_liability_redirects_from_producer ON public.liability_redirects(from_producer_id);
CREATE INDEX idx_liability_redirects_to_producer ON public.liability_redirects(to_producer_id);
CREATE INDEX idx_liability_redirects_created_at ON public.liability_redirects(created_at DESC);