-- Add admin confirmation tracking columns to payment_confirmations
ALTER TABLE public.payment_confirmations
ADD COLUMN IF NOT EXISTS confirmed_by_admin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS confirmed_by_user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS paid_by text;

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_confirmed_by_admin 
ON public.payment_confirmations(confirmed_by_admin);

COMMENT ON COLUMN public.payment_confirmations.confirmed_by_admin IS 'Whether this payment was confirmed by an admin';
COMMENT ON COLUMN public.payment_confirmations.confirmed_by_user_id IS 'Admin user who confirmed the payment';
COMMENT ON COLUMN public.payment_confirmations.paid_by IS 'Name of person/entity who made the payment';