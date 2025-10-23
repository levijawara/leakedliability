-- Create RPC function to add money to confirmation pool
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
    updated_at = NOW();
END;
$$;