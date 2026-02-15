ALTER TABLE public.user_call_sheets
  ADD COLUMN IF NOT EXISTS payment_status_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_reversal_reason text,
  ADD COLUMN IF NOT EXISTS payment_reversal_reason_other text;