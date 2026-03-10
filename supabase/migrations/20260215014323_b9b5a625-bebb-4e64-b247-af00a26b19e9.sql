
-- Create production_instances table
CREATE TABLE public.production_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  global_call_sheet_id UUID UNIQUE REFERENCES public.global_call_sheets(id),
  production_name TEXT,
  company_name TEXT,
  primary_contacts JSONB,
  shoot_start_date DATE,
  extracted_date DATE,
  verification_status TEXT DEFAULT 'unverified',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.production_instances ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can view production instances"
  ON public.production_instances FOR SELECT USING (true);

-- Service role / admin write
CREATE POLICY "Admins can manage production instances"
  ON public.production_instances FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert production instances"
  ON public.production_instances FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update production instances"
  ON public.production_instances FOR UPDATE
  USING (true);

-- Backfill from existing parsed call sheets
INSERT INTO public.production_instances (global_call_sheet_id, production_name, company_name, extracted_date, verification_status)
SELECT
  id,
  project_title,
  NULL,
  parsed_date,
  'unverified'
FROM public.global_call_sheets
WHERE status IN ('parsed', 'complete')
ON CONFLICT (global_call_sheet_id) DO NOTHING;
