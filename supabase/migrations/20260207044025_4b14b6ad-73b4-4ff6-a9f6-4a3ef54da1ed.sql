ALTER TABLE public.leaderboard_config
  ADD COLUMN show_delinquent_only boolean NOT NULL DEFAULT false;