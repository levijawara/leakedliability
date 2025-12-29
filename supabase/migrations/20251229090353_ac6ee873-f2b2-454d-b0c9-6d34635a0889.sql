-- ===========================================
-- PHASE B: Global Call Sheet Architecture
-- Create tables first, then add cross-table RLS policies
-- ===========================================

-- 1. Create global_call_sheets table (the artifact)
CREATE TABLE public.global_call_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT NOT NULL,
  master_file_path TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  parsed_contacts JSONB,
  project_title TEXT,
  parsed_date DATE,
  status TEXT DEFAULT 'queued',
  contacts_extracted INTEGER DEFAULT 0,
  error_message TEXT,
  parsing_started_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  first_uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- The holy grail: unique hash enforced at DB level
ALTER TABLE public.global_call_sheets 
  ADD CONSTRAINT global_call_sheets_content_hash_unique UNIQUE (content_hash);

-- Index for fast lookups
CREATE INDEX idx_global_call_sheets_status ON public.global_call_sheets(status);
CREATE INDEX idx_global_call_sheets_hash ON public.global_call_sheets(content_hash);

-- Enable RLS (policies added later after user_call_sheets exists)
ALTER TABLE public.global_call_sheets ENABLE ROW LEVEL SECURITY;

-- 2. Create user_call_sheets table (the link)
CREATE TABLE public.user_call_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  global_call_sheet_id UUID NOT NULL REFERENCES public.global_call_sheets(id) ON DELETE CASCADE,
  user_label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, global_call_sheet_id)
);

-- Indexes
CREATE INDEX idx_user_call_sheets_user ON public.user_call_sheets(user_id);
CREATE INDEX idx_user_call_sheets_global ON public.user_call_sheets(global_call_sheet_id);

-- Enable RLS
ALTER TABLE public.user_call_sheets ENABLE ROW LEVEL SECURITY;

-- Users can view their own links
CREATE POLICY "Users can view their own call sheet links"
  ON public.user_call_sheets FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own links
CREATE POLICY "Users can insert their own call sheet links"
  ON public.user_call_sheets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own links (e.g., user_label)
CREATE POLICY "Users can update their own call sheet links"
  ON public.user_call_sheets FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own links
CREATE POLICY "Users can delete their own call sheet links"
  ON public.user_call_sheets FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage all
CREATE POLICY "Admins can manage all user call sheet links"
  ON public.user_call_sheets FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Now add RLS policies for global_call_sheets (user_call_sheets exists now)
-- Users can view global call sheets they're linked to
CREATE POLICY "Users can view linked global call sheets"
  ON public.global_call_sheets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_call_sheets ucs
      WHERE ucs.global_call_sheet_id = id AND ucs.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- System/Edge functions can insert (using service role)
CREATE POLICY "Service role can insert global call sheets"
  ON public.global_call_sheets FOR INSERT
  WITH CHECK (true);

-- System/Edge functions can update
CREATE POLICY "Service role can update global call sheets"
  ON public.global_call_sheets FOR UPDATE
  USING (true);

-- Admins can manage all
CREATE POLICY "Admins can manage all global call sheets"
  ON public.global_call_sheets FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Create contact_call_sheets join table (attribution)
CREATE TABLE public.contact_call_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.crew_contacts(id) ON DELETE CASCADE,
  call_sheet_id UUID NOT NULL REFERENCES public.global_call_sheets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contact_id, call_sheet_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_contact_call_sheets_contact ON public.contact_call_sheets(contact_id);
CREATE INDEX idx_contact_call_sheets_call_sheet ON public.contact_call_sheets(call_sheet_id);

-- Enable RLS
ALTER TABLE public.contact_call_sheets ENABLE ROW LEVEL SECURITY;

-- Users can view their own contact-callsheet links
CREATE POLICY "Users can view their own contact call sheet links"
  ON public.contact_call_sheets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_contacts 
      WHERE id = contact_id AND user_id = auth.uid()
    )
  );

-- Users can insert their own contact-callsheet links
CREATE POLICY "Users can insert their own contact call sheet links"
  ON public.contact_call_sheets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crew_contacts 
      WHERE id = contact_id AND user_id = auth.uid()
    )
  );

-- Users can delete their own contact-callsheet links
CREATE POLICY "Users can delete their own contact call sheet links"
  ON public.contact_call_sheets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_contacts 
      WHERE id = contact_id AND user_id = auth.uid()
    )
  );

-- Admins can manage all
CREATE POLICY "Admins can manage all contact call sheet links"
  ON public.contact_call_sheets FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Create trigger for updated_at on global_call_sheets
CREATE TRIGGER update_global_call_sheets_updated_at
  BEFORE UPDATE ON public.global_call_sheets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();