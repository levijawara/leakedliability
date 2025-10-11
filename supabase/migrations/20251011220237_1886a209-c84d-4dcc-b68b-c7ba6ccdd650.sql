-- Add report_id column to payment_reports (unique constraint on submissions.report_id already exists)
ALTER TABLE public.payment_reports
ADD COLUMN IF NOT EXISTS report_id TEXT REFERENCES public.submissions(report_id);

-- Create producer_account_links table
CREATE TABLE IF NOT EXISTS public.producer_account_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  association_type TEXT NOT NULL CHECK (association_type IN ('permanent', 'temporary')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, producer_id)
);

-- Enable RLS on producer_account_links
ALTER TABLE public.producer_account_links ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for producer_account_links
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
    AND tablename = 'producer_account_links' 
    AND policyname = 'Users can view their own producer associations'
  ) THEN
    CREATE POLICY "Users can view their own producer associations"
    ON public.producer_account_links
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
    AND tablename = 'producer_account_links' 
    AND policyname = 'Users can create their own producer associations'
  ) THEN
    CREATE POLICY "Users can create their own producer associations"
    ON public.producer_account_links
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
    AND tablename = 'producer_account_links' 
    AND policyname = 'Admins can view all producer associations'
  ) THEN
    CREATE POLICY "Admins can view all producer associations"
    ON public.producer_account_links
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
    AND tablename = 'producer_account_links' 
    AND policyname = 'Admins can manage all producer associations'
  ) THEN
    CREATE POLICY "Admins can manage all producer associations"
    ON public.producer_account_links
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;