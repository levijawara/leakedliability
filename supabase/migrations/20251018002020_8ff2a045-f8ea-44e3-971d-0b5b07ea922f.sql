-- Update the grant_contributor_access function to:
-- 1. Lower threshold from 50 to 20 producers
-- 2. Include vendor_report submissions (in addition to crew_report)
-- 3. Grant access to vendor account types (in addition to crew)

CREATE OR REPLACE FUNCTION public.grant_contributor_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_account_type TEXT;
  is_threshold_locked BOOLEAN;
  verified_producer_count INTEGER;
BEGIN
  -- Proceed if status is 'verified' and it's either crew_report OR vendor_report
  IF NEW.status = 'verified' AND NEW.submission_type IN ('crew_report', 'vendor_report') THEN
    -- Check if user is crew or vendor
    SELECT account_type INTO user_account_type
    FROM public.profiles
    WHERE user_id = NEW.user_id;
    
    -- Grant to crew members OR vendors
    IF user_account_type IN ('crew', 'vendor') THEN
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
      
      -- Lock threshold if we hit 20 (lowered from 50)
      IF verified_producer_count >= 20 AND NOT is_threshold_locked THEN
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
$function$;