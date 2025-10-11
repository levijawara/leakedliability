-- Step 1: Create unique constraint on submissions.report_id
ALTER TABLE public.submissions
ADD CONSTRAINT unique_report_id UNIQUE (report_id);

-- Step 2: Add report_id column to payment_reports
ALTER TABLE public.payment_reports
ADD COLUMN report_id TEXT REFERENCES public.submissions(report_id);

-- Step 3: Create producer_account_links table
CREATE TABLE public.producer_account_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  association_type TEXT NOT NULL CHECK (association_type IN ('permanent', 'temporary')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, producer_id)
);

-- Step 4: Enable RLS on producer_account_links
ALTER TABLE public.producer_account_links ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for producer_account_links
CREATE POLICY "Users can view their own producer associations"
ON public.producer_account_links
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own producer associations"
ON public.producer_account_links
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all producer associations"
ON public.producer_account_links
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all producer associations"
ON public.producer_account_links
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));