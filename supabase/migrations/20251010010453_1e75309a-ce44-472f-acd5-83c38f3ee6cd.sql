-- Create storage bucket for submission documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submission-documents',
  'submission-documents',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
    'image/heif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
);

-- Storage policies for submission documents
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submission-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all submission documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-documents' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Create submissions table
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  submission_type text NOT NULL CHECK (submission_type IN (
    'crew_report',
    'counter_dispute',
    'payment_confirmation',
    'payment_documentation',
    'report_explanation',
    'report_dispute'
  )),
  
  -- User identification
  full_name text NOT NULL,
  email text NOT NULL,
  role_department text,
  
  -- Form data (stored as JSONB for flexibility)
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Document URLs (array of strings)
  document_urls text[] DEFAULT ARRAY[]::text[],
  
  -- Status and verification
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'verified', 'rejected')),
  verified boolean DEFAULT false,
  admin_notes text,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for submissions
CREATE POLICY "Users can create their own submissions"
ON public.submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own submissions"
ON public.submissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all submissions"
ON public.submissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update submissions"
ON public.submissions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_submissions_updated_at
BEFORE UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();