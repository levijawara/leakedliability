-- Create site_settings table for maintenance mode control
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view settings
CREATE POLICY "Anyone can view site settings"
  ON public.site_settings
  FOR SELECT
  USING (true);

-- Only admins can update settings
CREATE POLICY "Only admins can update site settings"
  ON public.site_settings
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Only admins can insert settings
CREATE POLICY "Only admins can insert site settings"
  ON public.site_settings
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert initial settings row
INSERT INTO public.site_settings (maintenance_mode, maintenance_message)
VALUES (false, 'We''re making improvements! Check back soon 🛠️')
ON CONFLICT DO NOTHING;

-- Add trigger to auto-update updated_at
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();