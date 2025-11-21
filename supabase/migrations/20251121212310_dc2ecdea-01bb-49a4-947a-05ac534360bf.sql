-- Create fafo_entries table
CREATE TABLE public.fafo_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hold_that_l_image_path TEXT NOT NULL,
  proof_image_path TEXT NOT NULL,
  created_by_admin_id UUID REFERENCES auth.users(id),
  display_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.fafo_entries ENABLE ROW LEVEL SECURITY;

-- Public can view all entries (including anonymous users)
CREATE POLICY "Anyone can view FAFO entries"
  ON public.fafo_entries 
  FOR SELECT
  TO public
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert FAFO entries"
  ON public.fafo_entries 
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete FAFO entries"
  ON public.fafo_entries 
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create fafo-results storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('fafo-results', 'fafo-results', true);

-- Storage RLS: Admins can upload
CREATE POLICY "Admins can upload to fafo-results"
  ON storage.objects 
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fafo-results' AND
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Storage RLS: Admins can delete
CREATE POLICY "Admins can delete from fafo-results"
  ON storage.objects 
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fafo-results' AND
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Storage RLS: Anyone can view
CREATE POLICY "Anyone can view fafo-results"
  ON storage.objects 
  FOR SELECT
  TO public
  USING (bucket_id = 'fafo-results');