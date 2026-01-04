-- Drop the public access policy that exposes financial details
DROP POLICY IF EXISTS "Anyone can view verified confirmations" ON public.payment_confirmations;

-- Create policy for admins to view all payment confirmations
CREATE POLICY "Admins can view all payment confirmations"
ON public.payment_confirmations
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create policy for involved parties to view their payment confirmations
-- Users can see confirmations where:
-- 1. They are the confirmer (the crew/vendor who received payment)
-- 2. They are linked to the producer who paid
-- 3. They are the reporter of the payment report
CREATE POLICY "Users can view their own payment confirmations"
ON public.payment_confirmations
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- User is the confirmer (crew/vendor who confirmed receipt)
    auth.uid() = confirmer_id OR
    auth.uid() = confirmed_by_user_id OR
    -- User is linked to the producer who made the payment
    producer_id IN (
      SELECT producer_id FROM public.producer_account_links
      WHERE user_id = auth.uid()
    ) OR
    -- User is the original reporter of the payment report
    payment_report_id IN (
      SELECT id FROM public.payment_reports
      WHERE reporter_id = auth.uid()
    )
  )
);