-- Add blur_names_for_public field to site_settings table
ALTER TABLE public.site_settings
ADD COLUMN blur_names_for_public boolean NOT NULL DEFAULT true;