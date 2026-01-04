-- Add document_urls array to payment_reports for arena transcripts and other documents
ALTER TABLE public.payment_reports
ADD COLUMN IF NOT EXISTS document_urls TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_reports_document_urls ON public.payment_reports USING GIN(document_urls);

