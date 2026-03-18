-- Adds admin-editable leaderboard header copy.
-- Used by `src/pages/Leaderboard.tsx` for MAIN/Header and Sub-header fields.

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS leaderboard_main_header TEXT DEFAULT 'Producer Debt Leaderboard',
  ADD COLUMN IF NOT EXISTS leaderboard_sub_header TEXT DEFAULT '';

