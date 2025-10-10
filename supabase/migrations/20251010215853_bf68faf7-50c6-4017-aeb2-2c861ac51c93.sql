-- Fix storage bucket security issues
-- 1. Update storage policies to use more secure patterns
-- 2. Add CASCADE delete for submission documents

-- First, check and drop existing policies
DO $$ 
BEGIN
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can view all submission documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload submission documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users cannot directly list storage objects" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete submission documents" ON storage.objects;
END $$;

-- Create improved storage policies with tighter security
-- Users can only upload to submission-documents bucket with authenticated access
CREATE POLICY "Authenticated users can upload submission documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submission-documents' AND
  auth.uid() IS NOT NULL
);

-- Users cannot directly list storage objects - they must use signed URLs
CREATE POLICY "Users cannot directly list storage objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (false);

-- Admins can view all documents
CREATE POLICY "Admins can view all submission documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-documents' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can delete documents
CREATE POLICY "Admins can delete submission documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'submission-documents' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Add function to clean up storage files when submission is deleted
CREATE OR REPLACE FUNCTION public.delete_submission_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  -- Delete all files associated with this submission
  IF OLD.document_urls IS NOT NULL THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'submission-documents'
    AND name = ANY(OLD.document_urls);
  END IF;
  RETURN OLD;
END;
$$;

-- Add trigger to automatically delete files when submission is deleted
DROP TRIGGER IF EXISTS on_submission_delete ON public.submissions;
CREATE TRIGGER on_submission_delete
  BEFORE DELETE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_submission_files();