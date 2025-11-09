-- Add admin creation tracking to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES auth.users(id);

-- Add admin creation tracking to payment_reports table
ALTER TABLE payment_reports
  ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_creator_id UUID REFERENCES auth.users(id);

-- Create index for faster queries on admin-created accounts
CREATE INDEX IF NOT EXISTS idx_profiles_created_by_admin ON profiles(created_by_admin) WHERE created_by_admin = TRUE;
CREATE INDEX IF NOT EXISTS idx_payment_reports_created_by_admin ON payment_reports(created_by_admin) WHERE created_by_admin = TRUE;