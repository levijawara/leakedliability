-- Enhance disputes table with round-based tracking and resolution metadata
ALTER TABLE public.disputes
ADD COLUMN round INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN resolution_type TEXT CHECK (resolution_type IN ('paid', 'mutual_agreement', 'unresolved', NULL)),
ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN evidence_metadata JSONB DEFAULT '{}'::jsonb;

-- Update status column to include new statuses
ALTER TABLE public.disputes
DROP CONSTRAINT IF EXISTS disputes_status_check,
ADD CONSTRAINT disputes_status_check CHECK (status IN ('pending', 'open', 'round_1_review', 'round_2_review', 'round_3_review', 'awaiting_info', 'resolved', 'unresolved'));

-- Create dispute_evidence table for structured evidence tracking
CREATE TABLE public.dispute_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL,
  round INTEGER NOT NULL DEFAULT 1,
  file_paths TEXT[] DEFAULT ARRAY[]::TEXT[],
  explanation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create dispute_timeline table for immutable audit trail
CREATE TABLE public.dispute_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('dispute_opened', 'evidence_submitted', 'round_started', 'info_requested', 'resolution_proposed', 'dispute_resolved', 'dispute_closed')),
  actor_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_dispute_evidence_dispute_id ON public.dispute_evidence(dispute_id);
CREATE INDEX idx_dispute_evidence_submitted_by ON public.dispute_evidence(submitted_by);
CREATE INDEX idx_dispute_evidence_round ON public.dispute_evidence(round);
CREATE INDEX idx_dispute_timeline_dispute_id ON public.dispute_timeline(dispute_id);
CREATE INDEX idx_dispute_timeline_created_at ON public.dispute_timeline(created_at DESC);
CREATE INDEX idx_disputes_round ON public.disputes(round);
CREATE INDEX idx_disputes_resolution_type ON public.disputes(resolution_type);

-- Enable RLS on new tables
ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_timeline ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dispute_evidence
CREATE POLICY "Admins can view all evidence"
  ON public.dispute_evidence FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view evidence from their disputes"
  ON public.dispute_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.disputes d
      WHERE d.id = dispute_evidence.dispute_id
      AND (d.disputer_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.payment_reports pr
        WHERE pr.id = d.payment_report_id
        AND (pr.reporter_id = auth.uid() OR pr.producer_id IN (
          SELECT producer_id FROM public.producer_account_links
          WHERE user_id = auth.uid()
        ))
      ))
    )
  );

CREATE POLICY "Users can submit evidence to their disputes"
  ON public.dispute_evidence FOR INSERT
  WITH CHECK (
    auth.uid() = submitted_by
    AND EXISTS (
      SELECT 1 FROM public.disputes d
      WHERE d.id = dispute_evidence.dispute_id
      AND d.status IN ('open', 'awaiting_info')
      AND (d.disputer_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.payment_reports pr
        WHERE pr.id = d.payment_report_id
        AND (pr.reporter_id = auth.uid() OR pr.producer_id IN (
          SELECT producer_id FROM public.producer_account_links
          WHERE user_id = auth.uid()
        ))
      ))
    )
  );

-- RLS Policies for dispute_timeline
CREATE POLICY "Admins can view all timeline events"
  ON public.dispute_timeline FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view timeline from their disputes"
  ON public.dispute_timeline FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.disputes d
      WHERE d.id = dispute_timeline.dispute_id
      AND (d.disputer_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.payment_reports pr
        WHERE pr.id = d.payment_report_id
        AND (pr.reporter_id = auth.uid() OR pr.producer_id IN (
          SELECT producer_id FROM public.producer_account_links
          WHERE user_id = auth.uid()
        ))
      ))
    )
  );

CREATE POLICY "System can insert timeline events"
  ON public.dispute_timeline FOR INSERT
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE public.dispute_evidence IS 'Stores evidence submissions for each dispute round with immutable timestamps';
COMMENT ON TABLE public.dispute_timeline IS 'Immutable audit trail of all dispute events for legal protection';
COMMENT ON COLUMN public.disputes.round IS 'Current evidence submission round (increments when more info is requested)';
COMMENT ON COLUMN public.disputes.resolution_type IS 'How the dispute was resolved: paid, mutual_agreement, or unresolved';