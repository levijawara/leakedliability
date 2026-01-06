-- Create table to store dedupe exceptions (false positive records)
CREATE TABLE public.contact_dedupe_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id_a UUID NOT NULL REFERENCES public.crew_contacts(id) ON DELETE CASCADE,
  contact_id_b UUID NOT NULL REFERENCES public.crew_contacts(id) ON DELETE CASCADE,
  field_type TEXT NOT NULL CHECK (field_type IN ('email', 'phone', 'ig', 'role', 'name')),
  field_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, contact_id_a, contact_id_b, field_type, field_value)
);

-- Enable RLS
ALTER TABLE public.contact_dedupe_exceptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own exceptions
CREATE POLICY "Users can view their own dedupe exceptions"
ON public.contact_dedupe_exceptions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own exceptions
CREATE POLICY "Users can create their own dedupe exceptions"
ON public.contact_dedupe_exceptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own exceptions
CREATE POLICY "Users can delete their own dedupe exceptions"
ON public.contact_dedupe_exceptions
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_dedupe_exceptions_user_contacts 
ON public.contact_dedupe_exceptions(user_id, contact_id_a, contact_id_b);