-- Phase 1: Fix Producer Email Exposure (CRITICAL)
-- Drop permissive public policies that expose emails
DROP POLICY IF EXISTS "Anyone can view verified payment reports" ON public.payment_reports;
DROP POLICY IF EXISTS "Anyone can view verified reports" ON public.payment_reports;

-- Create a scrubbed view for anonymous access (no emails)
CREATE OR REPLACE VIEW public.public_payment_reports AS
SELECT 
  id,
  days_overdue,
  producer_id,
  reporter_id,
  amount_owed,
  invoice_date,
  payment_date,
  verified,
  created_at,
  updated_at,
  closed_date,
  project_name,
  reporter_type,
  report_id,
  city,
  status
FROM public.payment_reports
WHERE verified = true;

-- Grant anon read access to the VIEW only
GRANT SELECT ON public.public_payment_reports TO anon;

-- Phase 2: Lock Down Storage (CRITICAL)
-- Storage RLS for submission-documents bucket
CREATE POLICY "Users can only read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-documents' 
  AND owner = auth.uid()
);

CREATE POLICY "Users can only upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submission-documents'
  AND owner = auth.uid()
);

CREATE POLICY "Users can only delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'submission-documents'
  AND owner = auth.uid()
);

-- Admins need full access for verification
CREATE POLICY "Admins can access all documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'submission-documents'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Phase 3: Defense-in-Depth for Sensitive Tables
-- Explicit denies for anonymous access (redundant but safe)
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to submissions"
ON public.submissions FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to notification queue"
ON public.queued_producer_notifications FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to email logs"
ON public.email_logs FOR SELECT
TO anon
USING (false);