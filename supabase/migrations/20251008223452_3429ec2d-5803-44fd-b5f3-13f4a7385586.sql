-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Only admins can insert roles (we'll handle first admin manually)
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Fix #2: Restrict disputes viewing
-- Drop the public viewing policy
DROP POLICY IF EXISTS "Anyone can view disputes" ON public.disputes;

-- Create admin-only policy for viewing all disputes
CREATE POLICY "Admins can view all disputes"
ON public.disputes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Fix #3: Restrict producer updates to admins only
-- Drop the current update policy
DROP POLICY IF EXISTS "Authenticated users can update producers" ON public.producers;

-- Create admin-only update policy
CREATE POLICY "Admins can update producers"
ON public.producers
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Note: After this migration, you'll need to manually add your user as an admin
-- Run this query with your user_id:
-- INSERT INTO public.user_roles (user_id, role) VALUES ('your-user-id-here', 'admin');