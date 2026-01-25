-- Drop the unique CONSTRAINT (not index) on video_id to allow NULLs
ALTER TABLE youtube_videos DROP CONSTRAINT IF EXISTS youtube_videos_video_id_key;

-- Create partial unique index (only enforces uniqueness when video_id is not null)
CREATE UNIQUE INDEX IF NOT EXISTS youtube_videos_video_id_unique 
  ON youtube_videos (video_id) 
  WHERE video_id IS NOT NULL;