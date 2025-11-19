-- Drop the blur_names_for_public column from site_settings
ALTER TABLE site_settings 
DROP COLUMN IF EXISTS blur_names_for_public;