
DROP POLICY IF EXISTS "Anyone can view producers" ON public.producers;
DROP POLICY IF EXISTS "Public can view producers" ON public.producers;

CREATE POLICY "Authenticated users can view producers"
ON public.producers
FOR SELECT
TO authenticated
USING (true);
