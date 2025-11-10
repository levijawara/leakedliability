-- Create search_logs table for tracking producer searches
CREATE TABLE public.search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  searched_name text NOT NULL,
  matched_producer_id uuid NULL REFERENCES public.producers(id) ON DELETE SET NULL,
  user_ip text NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Add indexes for fast queries
CREATE INDEX idx_search_logs_searched_name ON public.search_logs(searched_name);
CREATE INDEX idx_search_logs_created_at ON public.search_logs(created_at DESC);
CREATE INDEX idx_search_logs_producer_id ON public.search_logs(matched_producer_id);

-- Enable RLS
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for logging
CREATE POLICY "Anyone can log searches"
  ON public.search_logs
  FOR INSERT
  WITH CHECK (true);

-- Admins can view all logs
CREATE POLICY "Admins can view all search logs"
  ON public.search_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to get top searches with trending data
CREATE OR REPLACE FUNCTION public.get_top_searches()
RETURNS TABLE (
  searched_name text,
  search_count bigint,
  last_searched timestamp with time zone,
  recent_searches_7d bigint,
  matched_producer_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    sl.searched_name,
    COUNT(*) as search_count,
    MAX(sl.created_at) as last_searched,
    COUNT(*) FILTER (WHERE sl.created_at > NOW() - INTERVAL '7 days') as recent_searches_7d,
    p.name as matched_producer_name
  FROM search_logs sl
  LEFT JOIN producers p ON sl.matched_producer_id = p.id
  GROUP BY sl.searched_name, p.name
  ORDER BY search_count DESC
  LIMIT 50;
$$;