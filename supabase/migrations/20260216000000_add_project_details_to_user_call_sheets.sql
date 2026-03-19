-- Optional project details (what/who) for call sheet identification
ALTER TABLE public.user_call_sheets
ADD COLUMN IF NOT EXISTS project_type TEXT,
ADD COLUMN IF NOT EXISTS project_subject TEXT;

COMMENT ON COLUMN public.user_call_sheets.project_type IS 'Job type: Commercial, Music Video, Podcast, etc.';
COMMENT ON COLUMN public.user_call_sheets.project_subject IS 'Talent/client/brand: Drake, Target, StarTalk, etc.';
