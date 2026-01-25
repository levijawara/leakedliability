-- Add YouTube tracking columns to global_call_sheets
ALTER TABLE public.global_call_sheets
ADD COLUMN youtube_url TEXT DEFAULT NULL,
ADD COLUMN youtube_view_count BIGINT DEFAULT NULL,
ADD COLUMN youtube_last_synced TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for efficient queries on sheets with YouTube data
CREATE INDEX idx_global_call_sheets_youtube_url ON public.global_call_sheets (youtube_url) WHERE youtube_url IS NOT NULL;