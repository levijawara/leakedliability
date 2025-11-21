-- Create analytics table
CREATE TABLE public.analytics_daily_visitors (
  id BIGSERIAL PRIMARY KEY,
  day DATE NOT NULL,
  hashed_visitor TEXT NOT NULL,
  country TEXT,
  region TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce uniqueness per visitor per day
CREATE UNIQUE INDEX analytics_daily_visitors_day_visitor_idx
  ON public.analytics_daily_visitors (day, hashed_visitor);

-- Enable RLS
ALTER TABLE public.analytics_daily_visitors ENABLE ROW LEVEL SECURITY;

-- Admins can read analytics
CREATE POLICY "Admins can read analytics"
  ON public.analytics_daily_visitors
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow unauthenticated inserts from edge function
CREATE POLICY "Public insert via edge function"
  ON public.analytics_daily_visitors
  FOR INSERT
  WITH CHECK (true);

-- Index for fast day-based queries
CREATE INDEX analytics_daily_visitors_day_idx ON public.analytics_daily_visitors (day DESC);

-- Index for geo breakdown queries
CREATE INDEX analytics_daily_visitors_geo_idx ON public.analytics_daily_visitors (day, country, region, city);

-- RPC: Get daily visitor stats
CREATE OR REPLACE FUNCTION public.get_daily_visitor_stats(start_date DATE)
RETURNS TABLE(day DATE, unique_visitors BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    day,
    COUNT(DISTINCT hashed_visitor) AS unique_visitors
  FROM analytics_daily_visitors
  WHERE day >= start_date
  GROUP BY day
  ORDER BY day DESC;
$$;

-- RPC: Get geo breakdown for a specific day
CREATE OR REPLACE FUNCTION public.get_geo_breakdown(selected_day DATE)
RETURNS TABLE(country TEXT, region TEXT, city TEXT, visitor_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    country,
    region,
    city,
    COUNT(*) AS visitor_count
  FROM analytics_daily_visitors
  WHERE day = selected_day
  GROUP BY country, region, city
  ORDER BY visitor_count DESC;
$$;