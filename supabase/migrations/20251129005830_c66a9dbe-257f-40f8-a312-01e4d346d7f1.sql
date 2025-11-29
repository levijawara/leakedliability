-- Add user tracking columns to search_logs for admin notifications
ALTER TABLE search_logs 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Add index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON search_logs(user_id);