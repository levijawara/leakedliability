-- Add identity verification columns to producers table
ALTER TABLE producers
ADD COLUMN IF NOT EXISTS stripe_verification_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_verification_status TEXT DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS claimed_by_user_id UUID,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Add constraint for verification status values
ALTER TABLE producers
ADD CONSTRAINT producers_stripe_verification_status_check 
CHECK (stripe_verification_status IN ('unverified', 'pending', 'verified', 'pending_admin', 'rejected'));

-- Create identity_claim_history audit table
CREATE TABLE IF NOT EXISTS identity_claim_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  stripe_session_id TEXT,
  verification_report_id TEXT,
  matched_name TEXT,
  matched_email_domain TEXT,
  rejection_reason TEXT,
  admin_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on identity_claim_history
ALTER TABLE identity_claim_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for identity_claim_history
CREATE POLICY "Admins can view all claim history"
ON identity_claim_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert claim history"
ON identity_claim_history
FOR INSERT
WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_identity_claim_history_producer_id ON identity_claim_history(producer_id);
CREATE INDEX IF NOT EXISTS idx_identity_claim_history_user_id ON identity_claim_history(user_id);
CREATE INDEX IF NOT EXISTS idx_producers_claimed_by_user_id ON producers(claimed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_producers_stripe_verification_status ON producers(stripe_verification_status);