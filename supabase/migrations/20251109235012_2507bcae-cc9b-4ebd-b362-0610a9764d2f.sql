-- Add admin tracking columns to producers table
ALTER TABLE producers
ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_creator_id UUID REFERENCES auth.users(id);

-- Create index for faster queries on admin-created producers
CREATE INDEX IF NOT EXISTS idx_producers_created_by_admin 
ON producers(created_by_admin) 
WHERE created_by_admin = true;