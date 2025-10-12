-- Create user_entitlements table to track leaderboard access
CREATE TABLE public.user_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entitlement_type TEXT NOT NULL DEFAULT 'leaderboard',
  source TEXT NOT NULL, -- 'contributor' | 'stripe_subscription' | 'admin_override'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'inactive' | 'cancelled'
  subscription_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, entitlement_type)
);

-- Enable RLS
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own entitlements"
ON public.user_entitlements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all entitlements"
ON public.user_entitlements FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Auto-update timestamp trigger
CREATE TRIGGER update_user_entitlements_updated_at
BEFORE UPDATE ON public.user_entitlements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create leaderboard_config table for threshold lock tracking
CREATE TABLE public.leaderboard_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMP WITH TIME ZONE,
  producer_count_at_lock INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Only one row should exist
CREATE UNIQUE INDEX leaderboard_config_singleton ON public.leaderboard_config((true));

-- Enable RLS
ALTER TABLE public.leaderboard_config ENABLE ROW LEVEL SECURITY;

-- Anyone can view config
CREATE POLICY "Anyone can view leaderboard config"
ON public.leaderboard_config FOR SELECT
USING (true);

-- Only admins can modify config
CREATE POLICY "Only admins can modify leaderboard config"
ON public.leaderboard_config FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Insert initial config row
INSERT INTO public.leaderboard_config (threshold_locked, producer_count_at_lock)
VALUES (false, 0);

-- Function to auto-grant contributor access when crew gets verified report
CREATE OR REPLACE FUNCTION grant_contributor_access()
RETURNS TRIGGER AS $$
DECLARE
  user_account_type TEXT;
  is_threshold_locked BOOLEAN;
  verified_producer_count INTEGER;
BEGIN
  -- Only proceed if status is 'verified' and it's a crew_report
  IF NEW.status = 'verified' AND NEW.submission_type = 'crew_report' THEN
    -- Check if user is crew
    SELECT account_type INTO user_account_type
    FROM public.profiles
    WHERE user_id = NEW.user_id;
    
    -- Only grant to crew members
    IF user_account_type = 'crew' THEN
      -- Check if threshold is locked
      SELECT threshold_locked INTO is_threshold_locked
      FROM public.leaderboard_config
      LIMIT 1;
      
      -- Only grant free access if threshold not locked
      IF NOT is_threshold_locked THEN
        -- Grant or update entitlement
        INSERT INTO public.user_entitlements (
          user_id,
          entitlement_type,
          source,
          status
        ) VALUES (
          NEW.user_id,
          'leaderboard',
          'contributor',
          'active'
        )
        ON CONFLICT (user_id, entitlement_type)
        DO UPDATE SET
          source = CASE 
            WHEN EXCLUDED.source = 'admin_override' THEN 'admin_override'
            ELSE 'contributor'
          END,
          status = 'active',
          updated_at = now();
      END IF;
      
      -- Check if this verification pushes us over the threshold
      SELECT COUNT(DISTINCT producer_id) INTO verified_producer_count
      FROM public.payment_reports
      WHERE verified = true;
      
      -- Lock threshold if we hit 50
      IF verified_producer_count >= 50 AND NOT is_threshold_locked THEN
        UPDATE public.leaderboard_config
        SET 
          threshold_locked = true,
          locked_at = now(),
          producer_count_at_lock = verified_producer_count,
          updated_at = now();
        
        -- Revoke all contributor access (except admin overrides)
        UPDATE public.user_entitlements
        SET 
          status = 'inactive',
          updated_at = now()
        WHERE entitlement_type = 'leaderboard'
          AND source = 'contributor';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for auto-granting contributor access
CREATE TRIGGER submissions_grant_contributor_access
AFTER INSERT OR UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION grant_contributor_access();