-- Add payment status columns to user_call_sheets
ALTER TABLE user_call_sheets 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unanswered',
ADD COLUMN IF NOT EXISTS payment_status_locked boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN user_call_sheets.payment_status IS 'Payment status: unanswered, waiting, paid, unpaid_needs_proof, free_labor';
COMMENT ON COLUMN user_call_sheets.payment_status_locked IS 'When true, PAID? UI is hidden forever for this call sheet';