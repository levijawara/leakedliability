-- Create call_sheet_config table for rate limiting settings
CREATE TABLE public.call_sheet_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_limit_enabled BOOLEAN DEFAULT false,
  rate_limit_per_hour INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_sheet_config ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view call sheet config" 
ON public.call_sheet_config 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can modify call sheet config" 
ON public.call_sheet_config 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default config (rate limiting OFF for seeding)
INSERT INTO public.call_sheet_config (rate_limit_enabled, rate_limit_per_hour)
VALUES (false, 20);

-- Create rate limit check function
CREATE OR REPLACE FUNCTION public.check_call_sheet_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_rate_limit_enabled BOOLEAN;
  hourly_limit INTEGER;
  is_admin BOOLEAN;
  upload_count INTEGER;
BEGIN
  -- Check if rate limiting is enabled
  SELECT rate_limit_enabled, rate_limit_per_hour 
  INTO is_rate_limit_enabled, hourly_limit
  FROM call_sheet_config LIMIT 1;
  
  -- If rate limiting is OFF, allow everything
  IF NOT COALESCE(is_rate_limit_enabled, false) THEN
    RETURN NEW;
  END IF;
  
  -- Check if user is admin (bypass)
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = NEW.user_id AND role = 'admin'
  ) INTO is_admin;
  
  IF is_admin THEN
    RETURN NEW;
  END IF;
  
  -- Count uploads in last hour
  SELECT COUNT(*) INTO upload_count
  FROM call_sheets
  WHERE user_id = NEW.user_id
    AND uploaded_at > NOW() - INTERVAL '1 hour';
  
  IF upload_count >= hourly_limit THEN
    -- Log the hit silently
    INSERT INTO audit_logs (user_id, event_type, payload)
    VALUES (NEW.user_id, 'rate_limit_hit', jsonb_build_object(
      'resource', 'call_sheets',
      'count', upload_count,
      'limit', hourly_limit
    ));
    
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for rate limiting
CREATE TRIGGER check_call_sheet_rate_limit_before_insert
  BEFORE INSERT ON public.call_sheets
  FOR EACH ROW
  EXECUTE FUNCTION public.check_call_sheet_rate_limit();

-- Add update trigger for updated_at
CREATE TRIGGER update_call_sheet_config_updated_at
  BEFORE UPDATE ON public.call_sheet_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();