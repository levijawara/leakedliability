-- LL 2.0: production_instances table for Active Productions (Call Sheet Timer Board)
-- One row per parsed call sheet; powers the front-side leaderboard (no dollar fields).

CREATE TABLE public.production_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_call_sheet_id UUID NOT NULL REFERENCES public.global_call_sheets(id) ON DELETE CASCADE,
  production_name TEXT NOT NULL,
  company_name TEXT,
  primary_contacts JSONB DEFAULT '[]'::jsonb,
  shoot_start_date DATE,
  extracted_date DATE NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'partially_verified', 'verified')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(global_call_sheet_id)
);

COMMENT ON TABLE public.production_instances IS 'LL 2.0: One row per parsed call sheet for Active Productions timer board. No debt fields.';

CREATE INDEX idx_production_instances_extracted_date ON public.production_instances(extracted_date DESC);
CREATE INDEX idx_production_instances_shoot_start_date ON public.production_instances(shoot_start_date);
CREATE INDEX idx_production_instances_verification ON public.production_instances(verification_status);

-- RLS: public read for leaderboard
ALTER TABLE public.production_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for all"
  ON public.production_instances FOR SELECT
  USING (true);

CREATE POLICY "Allow insert for service role"
  ON public.production_instances FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update for service role"
  ON public.production_instances FOR UPDATE
  USING (true);

-- updated_at trigger
CREATE TRIGGER update_production_instances_updated_at
  BEFORE UPDATE ON public.production_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill from existing parsed/complete call sheets
INSERT INTO public.production_instances (
  global_call_sheet_id,
  production_name,
  company_name,
  primary_contacts,
  shoot_start_date,
  extracted_date,
  verification_status,
  metadata
)
SELECT
  g.id,
  COALESCE(g.project_title, g.original_file_name, 'Unknown Production'),
  NULL, -- company_name: not stored on global_call_sheets; can be enriched later
  COALESCE(g.canonical_producers, '[]'::jsonb),
  g.parsed_date,
  COALESCE(g.parsed_date, g.created_at::date),
  'unverified',
  '{}'::jsonb
FROM public.global_call_sheets g
WHERE g.status IN ('parsed', 'complete')
  AND NOT EXISTS (
    SELECT 1 FROM public.production_instances pi WHERE pi.global_call_sheet_id = g.id
  );
