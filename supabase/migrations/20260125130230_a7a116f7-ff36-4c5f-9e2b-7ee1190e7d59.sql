-- Global table for YouTube video metadata (one row per unique video)
CREATE TABLE youtube_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT UNIQUE NOT NULL,
  title TEXT,
  thumbnail_url TEXT,
  channel_title TEXT,
  channel_id TEXT,
  published_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  view_count BIGINT DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  comment_count BIGINT DEFAULT 0,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Link call sheets to their YouTube video
ALTER TABLE global_call_sheets 
  ADD COLUMN youtube_video_id UUID REFERENCES youtube_videos(id) ON DELETE SET NULL;

-- RLS: Enable and set policies
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view youtube videos"
  ON youtube_videos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage youtube videos"
  ON youtube_videos FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Allow service role / edge functions to upsert
CREATE POLICY "Service role can insert youtube videos"
  ON youtube_videos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update youtube videos"
  ON youtube_videos FOR UPDATE
  USING (true);

-- Indexes for fast lookups
CREATE INDEX idx_youtube_videos_video_id ON youtube_videos(video_id);
CREATE INDEX idx_global_call_sheets_youtube_video_id ON global_call_sheets(youtube_video_id);