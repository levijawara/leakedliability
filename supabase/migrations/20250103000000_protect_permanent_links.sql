-- Migration: Protect Permanent Producer Account Links
-- This migration enforces that permanent links cannot be modified or deleted by users
-- Only admins can modify permanent links, and only user account deletion can remove them

-- Drop existing UPDATE/DELETE policies that allow users to modify their own links
DROP POLICY IF EXISTS "Users can update their own producer associations" ON public.producer_account_links;
DROP POLICY IF EXISTS "Users can delete their own producer associations" ON public.producer_account_links;

-- Create restrictive UPDATE policy: Users can only update temporary links, not permanent ones
-- Admins can update anything
CREATE POLICY "Users can only update temporary associations"
  ON public.producer_account_links
  FOR UPDATE
  USING (
    -- Admins can update anything
    public.has_role(auth.uid(), 'admin') OR
    -- Users can only update if it's a temporary link AND they own it
    (auth.uid() = user_id AND association_type = 'temporary')
  )
  WITH CHECK (
    -- Same conditions for the new values
    public.has_role(auth.uid(), 'admin') OR
    (auth.uid() = user_id AND association_type = 'temporary')
  );

-- Create restrictive DELETE policy: Users cannot delete permanent links
-- Only admins can delete, and cascade deletion from user accounts still works
CREATE POLICY "Users cannot delete permanent associations"
  ON public.producer_account_links
  FOR DELETE
  USING (
    -- Admins can delete anything
    public.has_role(auth.uid(), 'admin') OR
    -- Users can only delete temporary links
    (auth.uid() = user_id AND association_type = 'temporary')
  );

-- Add a comment to the table documenting the permanent link behavior
COMMENT ON TABLE public.producer_account_links IS 
  'Links users to producer entities. Permanent links are irreversible except by user account deletion. Temporary links are deprecated - use escrow for third-party payments.';

-- Add a comment to the association_type column
COMMENT ON COLUMN public.producer_account_links.association_type IS 
  'permanent: irreversible user-producer link (removed only by user account deletion). temporary: deprecated, legacy only.';

