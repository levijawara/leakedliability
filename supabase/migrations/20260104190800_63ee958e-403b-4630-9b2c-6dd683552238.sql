-- Create beta_access_codes table
CREATE TABLE public.beta_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 10,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expired_at TIMESTAMPTZ
);

-- Create beta_access_redemptions table
CREATE TABLE public.beta_access_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_id UUID NOT NULL REFERENCES public.beta_access_codes(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id) -- One redemption per user EVER
);

-- Add beta_access column to profiles
ALTER TABLE public.profiles ADD COLUMN beta_access BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS on both tables
ALTER TABLE public.beta_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_access_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for beta_access_codes (admin only)
CREATE POLICY "Admins can manage beta_access_codes"
ON public.beta_access_codes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for beta_access_redemptions
CREATE POLICY "Users can insert their own redemption"
ON public.beta_access_redemptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own redemptions"
ON public.beta_access_redemptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all redemptions"
ON public.beta_access_redemptions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));