-- Add producer_email column to payment_reports table
ALTER TABLE public.payment_reports 
ADD COLUMN producer_email TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.payment_reports.producer_email IS 'Email address of the producer/company from the original crew report submission';