ALTER TABLE public.user_call_sheets
  ADD COLUMN IF NOT EXISTS project_type TEXT,
  ADD COLUMN IF NOT EXISTS project_subject TEXT;