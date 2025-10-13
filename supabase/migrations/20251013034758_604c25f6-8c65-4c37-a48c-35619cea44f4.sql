-- Fix 1: Remove public insert policy on producers table
DROP POLICY IF EXISTS "Authenticated users can create producers" ON public.producers;

-- Fix 2: Add RLS policies for submission-documents storage bucket
-- Allow users to upload their own files
CREATE POLICY "Users can upload submission documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submission-documents' AND
  auth.uid() IS NOT NULL
);

-- Allow users to read their own submissions' files
CREATE POLICY "Users can view their own submission documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-documents' AND
  name IN (
    SELECT unnest(document_urls)
    FROM public.submissions
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to access all submission documents
CREATE POLICY "Admins can manage all submission documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'submission-documents' AND
  public.has_role(auth.uid(), 'admin')
);