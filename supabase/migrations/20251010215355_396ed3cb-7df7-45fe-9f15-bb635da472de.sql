-- Fix Critical Security Issues

-- 1. Enable RLS on payment_reports table
ALTER TABLE public.payment_reports ENABLE ROW LEVEL SECURITY;

-- 2. Add RLS policies for payment_reports
CREATE POLICY "Users can view their own reports"
ON public.payment_reports
FOR SELECT
USING (auth.uid() = reporter_id);

CREATE POLICY "Anyone can view verified reports"
ON public.payment_reports
FOR SELECT
USING (verified = true);

CREATE POLICY "Users can create their own reports"
ON public.payment_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can update their own reports"
ON public.payment_reports
FOR UPDATE
USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can manage all reports"
ON public.payment_reports
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Drop overly permissive disputes policy
DROP POLICY IF EXISTS "Anyone can view disputes" ON public.disputes;

-- 4. Add authenticated user INSERT policy for producers
CREATE POLICY "Authenticated users can create producers"
ON public.producers
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);