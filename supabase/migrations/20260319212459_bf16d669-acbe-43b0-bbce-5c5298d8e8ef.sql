ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS leaderboard_main_header TEXT,
ADD COLUMN IF NOT EXISTS leaderboard_sub_header TEXT;