-- Create escrow_payments table
CREATE TABLE public.escrow_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_report_id UUID NOT NULL REFERENCES public.payment_reports(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  crew_member_id UUID NOT NULL,
  amount_due NUMERIC(10,2) NOT NULL,
  payment_code TEXT NOT NULL UNIQUE,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'released', 'cancelled')),
  paid_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX idx_escrow_payments_payment_report ON public.escrow_payments(payment_report_id);
CREATE INDEX idx_escrow_payments_code ON public.escrow_payments(payment_code);
CREATE INDEX idx_escrow_payments_session ON public.escrow_payments(stripe_session_id);
CREATE INDEX idx_escrow_payments_status ON public.escrow_payments(status);

-- Enable RLS
ALTER TABLE public.escrow_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all escrow payments"
ON public.escrow_payments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "System can insert escrow payments"
ON public.escrow_payments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update escrow payments"
ON public.escrow_payments
FOR UPDATE
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_escrow_payments_updated_at
BEFORE UPDATE ON public.escrow_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to generate unique payment codes
CREATE OR REPLACE FUNCTION public.generate_payment_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-character alphanumeric code
    new_code := UPPER(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM escrow_payments WHERE payment_code = new_code) INTO code_exists;
    
    -- Exit loop if unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;