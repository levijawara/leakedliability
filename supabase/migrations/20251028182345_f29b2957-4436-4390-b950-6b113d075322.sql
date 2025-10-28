-- Fix missing WHERE clauses in confirmation_pool UPDATE statements

-- Fix calculate_confirmation_payout function
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
      payout_amount := 2.00;
      confirmation_speed := 'within_48h';
    ELSIF hours_elapsed <= 168 THEN -- 7 days
      payout_amount := 1.00;
      confirmation_speed := 'within_7d';
    ELSE
      payout_amount := 0.50;
      confirmation_speed := 'after_7d';
    END IF;
    
    -- Only award if pool has balance
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
      
      -- Update pool (FIX: Added WHERE clause)
      UPDATE public.confirmation_pool
      SET 
        total_distributed = total_distributed + payout_amount,
        available_balance = available_balance - payout_amount,
        updated_at = NOW()
      WHERE id IN (SELECT id FROM public.confirmation_pool LIMIT 1);
      
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

-- Fix add_to_confirmation_pool function
CREATE OR REPLACE FUNCTION public.add_to_confirmation_pool(amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.confirmation_pool
  SET 
    total_collected = total_collected + amount,
    available_balance = available_balance + amount,
    updated_at = NOW()
  WHERE id IN (SELECT id FROM public.confirmation_pool LIMIT 1);
END;
$$;