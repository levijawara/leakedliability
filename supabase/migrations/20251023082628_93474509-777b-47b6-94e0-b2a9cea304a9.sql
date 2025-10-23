-- Create producer_subscriptions table
CREATE TABLE IF NOT EXISTS public.producer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('tier_1', 'tier_2', 'tier_3')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  monthly_amount NUMERIC NOT NULL,
  contribution_to_pool NUMERIC NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(stripe_subscription_id)
);

-- Create confirmation_cash_transactions table
CREATE TABLE IF NOT EXISTS public.confirmation_cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  payment_report_id UUID NOT NULL REFERENCES public.payment_reports(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'redeemed')),
  confirmation_speed TEXT CHECK (confirmation_speed IN ('within_48h', 'within_7d')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create confirmation_cash_balances view
CREATE OR REPLACE VIEW public.confirmation_cash_balances AS
SELECT 
  user_id,
  COALESCE(SUM(CASE WHEN transaction_type = 'earned' THEN amount ELSE 0 END), 0) as total_earned,
  COALESCE(SUM(CASE WHEN transaction_type = 'redeemed' THEN amount ELSE 0 END), 0) as total_redeemed,
  COALESCE(SUM(CASE WHEN transaction_type = 'earned' THEN amount ELSE -amount END), 0) as available_balance
FROM public.confirmation_cash_transactions
GROUP BY user_id;

-- Create confirmation_pool table
CREATE TABLE IF NOT EXISTS public.confirmation_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_collected NUMERIC NOT NULL DEFAULT 0,
  total_distributed NUMERIC NOT NULL DEFAULT 0,
  available_balance NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (available_balance >= 0),
  CHECK (total_distributed <= total_collected)
);

-- Initialize pool with $100 seed money
INSERT INTO public.confirmation_pool (total_collected, total_distributed, available_balance)
VALUES (100.00, 0.00, 100.00)
ON CONFLICT DO NOTHING;

-- Add confirmation tracking columns to payment_reports
ALTER TABLE public.payment_reports 
ADD COLUMN IF NOT EXISTS confirmation_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS confirmation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_crew INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS score_update_scheduled_for TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS score_update_executed BOOLEAN DEFAULT false;

-- Add confirmation cash balance to profiles (denormalized for quick access)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS confirmation_cash_balance NUMERIC DEFAULT 0;

-- Add subscription tracking to producers
ALTER TABLE public.producers
ADD COLUMN IF NOT EXISTS subscription_tier TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS total_pool_contributions NUMERIC DEFAULT 0;

-- RLS Policies for producer_subscriptions
ALTER TABLE public.producer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all subscriptions"
ON public.producer_subscriptions FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Producers can view their own subscriptions"
ON public.producer_subscriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.producer_account_links
    WHERE producer_id = producer_subscriptions.producer_id
    AND user_id = auth.uid()
  )
);

-- RLS Policies for confirmation_cash_transactions
ALTER TABLE public.confirmation_cash_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
ON public.confirmation_cash_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
ON public.confirmation_cash_transactions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert transactions"
ON public.confirmation_cash_transactions FOR INSERT
WITH CHECK (true);

-- RLS Policies for confirmation_pool
ALTER TABLE public.confirmation_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pool balance"
ON public.confirmation_pool FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify pool"
ON public.confirmation_pool FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger: Set confirmation deadline when report status changes to 'pending'
CREATE OR REPLACE FUNCTION public.set_confirmation_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' AND (OLD.status IS NULL OR OLD.status != 'pending') THEN
    NEW.confirmation_deadline := NOW() + INTERVAL '7 days';
    NEW.score_update_scheduled_for := NEW.confirmation_deadline;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_confirmation_deadline
BEFORE UPDATE ON public.payment_reports
FOR EACH ROW
EXECUTE FUNCTION public.set_confirmation_deadline();

-- Trigger: Calculate confirmation payout when producer confirms
CREATE OR REPLACE FUNCTION public.calculate_confirmation_payout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pool_balance NUMERIC;
  payout_amount NUMERIC;
  confirmation_speed TEXT;
  hours_elapsed NUMERIC;
BEGIN
  -- Only process when status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Get current pool balance
    SELECT available_balance INTO pool_balance
    FROM public.confirmation_pool
    LIMIT 1;
    
    -- Calculate hours since report was created
    hours_elapsed := EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 3600;
    
    -- Determine payout amount and speed category
    IF hours_elapsed <= 48 THEN
      payout_amount := 0.50;
      confirmation_speed := 'within_48h';
    ELSIF hours_elapsed <= 168 THEN -- 7 days
      payout_amount := 0.25;
      confirmation_speed := 'within_7d';
    ELSE
      payout_amount := 0;
      confirmation_speed := NULL;
    END IF;
    
    -- Only award if within timeframe and pool has balance
    IF payout_amount > 0 AND pool_balance >= payout_amount THEN
      -- Insert transaction
      INSERT INTO public.confirmation_cash_transactions (
        user_id,
        payment_report_id,
        amount,
        transaction_type,
        confirmation_speed,
        metadata
      ) VALUES (
        NEW.reporter_id,
        NEW.id,
        payout_amount,
        'earned',
        confirmation_speed,
        jsonb_build_object(
          'hours_elapsed', hours_elapsed,
          'confirmed_at', NOW()
        )
      );
      
      -- Update pool
      UPDATE public.confirmation_pool
      SET 
        total_distributed = total_distributed + payout_amount,
        available_balance = available_balance - payout_amount,
        updated_at = NOW();
      
      -- Update user balance (denormalized)
      UPDATE public.profiles
      SET confirmation_cash_balance = confirmation_cash_balance + payout_amount
      WHERE user_id = NEW.reporter_id;
      
      -- Increment confirmation count
      NEW.confirmation_count := COALESCE(NEW.confirmation_count, 0) + 1;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_calculate_confirmation_payout
BEFORE UPDATE ON public.payment_reports
FOR EACH ROW
EXECUTE FUNCTION public.calculate_confirmation_payout();

-- Update the update_updated_at trigger for producer_subscriptions
CREATE TRIGGER update_producer_subscriptions_updated_at
BEFORE UPDATE ON public.producer_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();