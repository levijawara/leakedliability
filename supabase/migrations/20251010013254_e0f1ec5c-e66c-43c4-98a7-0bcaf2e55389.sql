-- Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create producers" ON public.producers;

-- Create admin-only INSERT policy
CREATE POLICY "Only admins can create producers"
ON public.producers
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Ensure DELETE is also admin-only
DROP POLICY IF EXISTS "Admins can delete producers" ON public.producers;

CREATE POLICY "Only admins can delete producers"
ON public.producers
FOR DELETE
USING (has_role(auth.uid(), 'admin'));