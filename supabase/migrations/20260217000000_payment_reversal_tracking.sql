-- Add payment confirmation and reversal tracking to user_call_sheets
-- When user clicks Yes, we store payment_status_confirmed_at.
-- When user later clicks No (after cooldown), we store the reason.

ALTER TABLE user_call_sheets
ADD COLUMN IF NOT EXISTS payment_status_confirmed_at timestamptz,
ADD COLUMN IF NOT EXISTS payment_reversal_reason text,
ADD COLUMN IF NOT EXISTS payment_reversal_reason_other text;

COMMENT ON COLUMN user_call_sheets.payment_status_confirmed_at IS 'When user confirmed paid (clicked Yes). Used for 1-business-day cooldown before allowing reversal.';
COMMENT ON COLUMN user_call_sheets.payment_reversal_reason IS 'Reason for changing from Yes to No: honest_mistake, bounced_check, payment_reversed, other';
COMMENT ON COLUMN user_call_sheets.payment_reversal_reason_other IS 'Free-text explanation when payment_reversal_reason = other';
