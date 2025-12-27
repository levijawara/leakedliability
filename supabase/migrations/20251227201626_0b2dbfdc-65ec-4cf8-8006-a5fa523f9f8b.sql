
-- ============================================================
-- EC → LL PHASE 1: DATABASE SCHEMA MIGRATION
-- Tables: call_sheets, crew_contacts, role_dictionary, 
--         custom_role_mappings, custom_departments, ig_usernames
-- Storage: call_sheets bucket
-- ============================================================

-- ------------------------------------------------------------
-- TABLE 1: call_sheets (USER-SCOPED)
-- Tracks uploaded call sheet files per user
-- ------------------------------------------------------------
CREATE TABLE public.call_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  content_hash TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'parsing', 'parsed', 'error', 'ignored')),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  parsed_date TIMESTAMPTZ,
  contacts_extracted INTEGER DEFAULT 0,
  parsed_contacts JSONB,
  review_completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_call_sheets_user ON public.call_sheets(user_id);
CREATE INDEX idx_call_sheets_status ON public.call_sheets(status);
CREATE INDEX idx_call_sheets_hash ON public.call_sheets(content_hash);

-- Enable RLS
ALTER TABLE public.call_sheets ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users see only their own, admins see all
CREATE POLICY "Users can view own call sheets" ON public.call_sheets 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own call sheets" ON public.call_sheets 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own call sheets" ON public.call_sheets 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own call sheets" ON public.call_sheets 
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all call sheets" ON public.call_sheets 
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all call sheets" ON public.call_sheets
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------
-- TABLE 2: crew_contacts (USER-SCOPED)
-- Stores parsed contacts from call sheets per user
-- ------------------------------------------------------------
CREATE TABLE public.crew_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phones TEXT[] DEFAULT '{}',
  emails TEXT[] DEFAULT '{}',
  roles TEXT[] DEFAULT '{}',
  departments TEXT[] DEFAULT '{}',
  source_files TEXT[] DEFAULT '{}',
  project_title TEXT,
  ig_handle TEXT,
  confidence NUMERIC DEFAULT 1.0,
  needs_review BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  hidden_ig_handle BOOLEAN DEFAULT false,
  hidden_roles TEXT[] DEFAULT '{}',
  hidden_departments TEXT[] DEFAULT '{}',
  hidden_phones TEXT[] DEFAULT '{}',
  hidden_emails TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_crew_contacts_user ON public.crew_contacts(user_id);
CREATE INDEX idx_crew_contacts_name ON public.crew_contacts(name);
CREATE INDEX idx_crew_contacts_departments ON public.crew_contacts USING GIN(departments);
CREATE INDEX idx_crew_contacts_ig ON public.crew_contacts(ig_handle);

-- Enable RLS
ALTER TABLE public.crew_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users see only their own, admins see all
CREATE POLICY "Users can view own contacts" ON public.crew_contacts 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts" ON public.crew_contacts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts" ON public.crew_contacts 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts" ON public.crew_contacts 
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all contacts" ON public.crew_contacts 
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all contacts" ON public.crew_contacts 
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Audit trigger (using LL's existing audit_logs schema: user_id, event_type, payload)
CREATE OR REPLACE FUNCTION public.log_crew_contact_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (user_id, event_type, payload)
  VALUES (
    auth.uid(),
    'crew_contact_' || LOWER(TG_OP),
    jsonb_build_object(
      'contact_id', COALESCE(NEW.id, OLD.id),
      'name', COALESCE(NEW.name, OLD.name),
      'departments', COALESCE(NEW.departments, OLD.departments),
      'source_files', COALESCE(NEW.source_files, OLD.source_files)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER crew_contacts_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.crew_contacts
  FOR EACH ROW EXECUTE FUNCTION public.log_crew_contact_audit();

-- ------------------------------------------------------------
-- TABLE 3: role_dictionary (SHARED - public read)
-- Master list of all known roles/departments
-- ------------------------------------------------------------
CREATE TABLE public.role_dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  department TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  is_custom BOOLEAN DEFAULT false,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique index on normalized role name
CREATE UNIQUE INDEX role_dictionary_normalized_idx 
  ON public.role_dictionary (LOWER(TRIM(role_name)));

-- Enable RLS
ALTER TABLE public.role_dictionary ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read, authenticated write
CREATE POLICY "Anyone can view roles" ON public.role_dictionary 
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert roles" ON public.role_dictionary 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update roles" ON public.role_dictionary 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete roles" ON public.role_dictionary 
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------
-- TABLE 4: custom_role_mappings (SHARED - public read)
-- User-defined role → department mappings
-- ------------------------------------------------------------
CREATE TABLE public.custom_role_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL,
  canonical_role TEXT,
  department TEXT NOT NULL,
  source_file TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint on role_name + department
CREATE UNIQUE INDEX custom_role_mappings_unique_idx 
  ON public.custom_role_mappings (LOWER(TRIM(role_name)), LOWER(TRIM(department)));

-- Index for fast lookups
CREATE INDEX idx_custom_role_mappings_role ON public.custom_role_mappings(role_name);

-- Enable RLS
ALTER TABLE public.custom_role_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read, authenticated write
CREATE POLICY "Anyone can view role mappings" ON public.custom_role_mappings 
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert mappings" ON public.custom_role_mappings 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update mappings" ON public.custom_role_mappings 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete mappings" ON public.custom_role_mappings 
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------
-- TABLE 5: custom_departments (SHARED - public read)
-- User-defined departments with sort order
-- ------------------------------------------------------------
CREATE TABLE public.custom_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_departments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read, authenticated write
CREATE POLICY "Anyone can view departments" ON public.custom_departments 
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert departments" ON public.custom_departments 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update departments" ON public.custom_departments 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete departments" ON public.custom_departments 
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------
-- TABLE 6: ig_usernames (SHARED - public read/write)
-- Instagram handle knowledge base from credits parsing
-- ------------------------------------------------------------
CREATE TABLE public.ig_usernames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL UNIQUE,
  roles TEXT[] DEFAULT '{}',
  co_workers TEXT[] DEFAULT '{}',
  raw_credits TEXT[] DEFAULT '{}',
  occurrences INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_ig_usernames_handle ON public.ig_usernames(handle);

-- Enable RLS
ALTER TABLE public.ig_usernames ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public access (crowd-sourced data)
CREATE POLICY "Anyone can view ig handles" ON public.ig_usernames 
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert handles" ON public.ig_usernames 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update handles" ON public.ig_usernames 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete handles" ON public.ig_usernames 
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Database function for batch upsert of IG handles
CREATE OR REPLACE FUNCTION public.upsert_ig_handles(handles_data jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  inserted_count INT := 0;
  updated_count INT := 0;
  handle_record JSONB;
BEGIN
  FOR handle_record IN SELECT * FROM jsonb_array_elements(handles_data)
  LOOP
    INSERT INTO public.ig_usernames (
      handle, roles, co_workers, raw_credits, occurrences
    )
    VALUES (
      (handle_record->>'handle')::TEXT,
      ARRAY(SELECT jsonb_array_elements_text(handle_record->'roles'))::TEXT[],
      ARRAY(SELECT jsonb_array_elements_text(handle_record->'co_workers'))::TEXT[],
      ARRAY(SELECT jsonb_array_elements_text(handle_record->'raw_credits'))::TEXT[],
      COALESCE((handle_record->>'occurrences')::INT, 1)
    )
    ON CONFLICT (handle) DO UPDATE SET
      roles = ARRAY(SELECT DISTINCT unnest(ig_usernames.roles || EXCLUDED.roles)),
      co_workers = ARRAY(SELECT DISTINCT unnest(ig_usernames.co_workers || EXCLUDED.co_workers)),
      raw_credits = ARRAY(SELECT DISTINCT unnest(ig_usernames.raw_credits || EXCLUDED.raw_credits)),
      occurrences = ig_usernames.occurrences + EXCLUDED.occurrences;

    IF FOUND THEN updated_count := updated_count + 1;
    ELSE inserted_count := inserted_count + 1;
    END IF;
  END LOOP;

  result := json_build_object('inserted', inserted_count, 'updated', updated_count);
  RETURN result;
END;
$$;

-- ------------------------------------------------------------
-- STORAGE: call_sheets bucket
-- Private bucket for storing uploaded PDFs
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('call_sheets', 'call_sheets', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Users can only access their own files
-- File paths must be: {user_id}/{filename}
CREATE POLICY "Users can upload own call sheet files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'call_sheets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own call sheet files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'call_sheets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own call sheet files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'call_sheets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can access all call sheet files"
ON storage.objects FOR ALL
USING (
  bucket_id = 'call_sheets' 
  AND public.has_role(auth.uid(), 'admin')
);
