-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create confirmations" ON payment_confirmations;

-- Create a new policy that allows authenticated users to insert their own confirmations
CREATE POLICY "Users can create payment confirmations"
ON payment_confirmations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = confirmer_id);