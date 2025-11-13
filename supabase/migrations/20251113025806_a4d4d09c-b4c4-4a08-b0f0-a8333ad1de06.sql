-- Create image_generations table for tracking HoldThatL image generations
CREATE TABLE IF NOT EXISTS public.image_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  producer_name TEXT NOT NULL,
  ig_handle TEXT NOT NULL,
  pscs_score NUMERIC NOT NULL,
  debt_amount NUMERIC NOT NULL,
  debt_age INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.image_generations ENABLE ROW LEVEL SECURITY;

-- Admins can view all generations
CREATE POLICY "Admins can view all image generations"
  ON public.image_generations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can insert their own generations
CREATE POLICY "Users can log their own image generations"
  ON public.image_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for analytics queries
CREATE INDEX idx_image_generations_created_at ON public.image_generations(created_at DESC);
CREATE INDEX idx_image_generations_user_id ON public.image_generations(user_id);