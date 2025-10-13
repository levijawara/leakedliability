-- Add email column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add unique constraint on email
ALTER TABLE profiles
ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- Backfill emails from auth.users for existing profiles
UPDATE profiles
SET email = auth.users.email
FROM auth.users
WHERE profiles.user_id = auth.users.id
AND profiles.email IS NULL;