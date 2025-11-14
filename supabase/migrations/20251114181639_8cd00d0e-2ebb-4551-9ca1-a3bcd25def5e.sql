-- Add global free access flag to leaderboard_config
ALTER TABLE leaderboard_config 
ADD COLUMN IF NOT EXISTS free_access_enabled BOOLEAN DEFAULT true;

-- Add report unlock tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS leaderboard_report_unlock BOOLEAN DEFAULT false;

-- Function to grant report unlock when crew/vendor report is verified
CREATE OR REPLACE FUNCTION grant_leaderboard_report_unlock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only for crew_report and vendor_report that get verified
  IF NEW.status = 'verified' 
     AND NEW.submission_type IN ('crew_report', 'vendor_report')
     AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    
    -- Grant permanent report unlock to user
    UPDATE profiles
    SET leaderboard_report_unlock = true
    WHERE user_id = NEW.user_id;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger fires after submission status is updated
DROP TRIGGER IF EXISTS on_submission_verified_grant_unlock ON submissions;
CREATE TRIGGER on_submission_verified_grant_unlock
  AFTER INSERT OR UPDATE OF status ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION grant_leaderboard_report_unlock();

-- Backfill: Grant report unlock to all users who already have verified reports
UPDATE profiles
SET leaderboard_report_unlock = true
WHERE user_id IN (
  SELECT DISTINCT user_id 
  FROM submissions 
  WHERE submission_type IN ('crew_report', 'vendor_report')
    AND status = 'verified'
);