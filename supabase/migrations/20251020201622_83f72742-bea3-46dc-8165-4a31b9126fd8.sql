-- Create suggestions table
CREATE TABLE public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  suggestion text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  client_ip inet,
  CONSTRAINT suggestion_length CHECK (char_length(suggestion) >= 5 AND char_length(suggestion) <= 4000)
);

-- Enable RLS
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authed) can insert
CREATE POLICY "suggestions_insert_anyone"
ON public.suggestions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Users can view their own submissions
CREATE POLICY "suggestions_select_self"
ON public.suggestions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "suggestions_select_admin"
ON public.suggestions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create admin view with profile data
CREATE OR REPLACE VIEW public.suggestions_with_profile AS
SELECT
  s.*,
  p.legal_first_name,
  p.legal_last_name,
  p.business_name,
  p.email,
  p.account_type,
  (SELECT COUNT(*) FROM public.suggestions s2 WHERE s2.user_id = s.user_id) AS total_suggestions_by_user
FROM public.suggestions s
LEFT JOIN public.profiles p ON p.user_id = s.user_id;