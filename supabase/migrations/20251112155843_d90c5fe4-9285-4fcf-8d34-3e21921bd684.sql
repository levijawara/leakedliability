-- Add source column to track where searches originated
ALTER TABLE public.search_logs 
ADD COLUMN source text DEFAULT 'leaderboard';

-- Create index for fast filtering by source
CREATE INDEX idx_search_logs_source ON public.search_logs(source);

-- Add check constraint to ensure valid values
ALTER TABLE public.search_logs
ADD CONSTRAINT search_logs_source_check 
CHECK (source IN ('homepage', 'leaderboard'));