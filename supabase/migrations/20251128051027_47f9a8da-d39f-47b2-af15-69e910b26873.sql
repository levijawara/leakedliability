-- Add placeholder tracking columns to producers table
ALTER TABLE producers ADD COLUMN IF NOT EXISTS is_placeholder BOOLEAN DEFAULT false;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS has_claimed_account BOOLEAN DEFAULT false;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_producers_placeholder ON producers(is_placeholder);

-- Update public_leaderboard view to EXCLUDE placeholders
DROP VIEW IF EXISTS public_leaderboard;
CREATE VIEW public_leaderboard AS
SELECT 
  p.id AS producer_id,
  p.name AS producer_name,
  p.company AS company_name,
  p.sub_name,
  calculate_pscs_score(p.id) AS pscs_score,
  p.total_amount_owed,
  p.oldest_debt_date,
  p.oldest_debt_days,
  p.total_crew_owed,
  p.total_vendors_owed,
  p.total_jobs_owed,
  p.total_cities_owed,
  p.paid_jobs_count,
  p.paid_crew_count,
  p.momentum_active_until
FROM producers p
WHERE p.account_status != 'banned'
  AND (p.is_placeholder = false OR p.is_placeholder IS NULL)
ORDER BY calculate_pscs_score(p.id) DESC, p.oldest_debt_days DESC;

-- Create separate search view that INCLUDES placeholders (for autocomplete)
CREATE OR REPLACE VIEW public_producer_search AS
SELECT 
  p.id AS producer_id,
  p.name AS producer_name,
  p.company AS company_name,
  p.is_placeholder,
  p.has_claimed_account
FROM producers p
WHERE p.account_status != 'banned';

-- Grant select on the new view to authenticated and anon users
GRANT SELECT ON public_producer_search TO authenticated;
GRANT SELECT ON public_producer_search TO anon;

-- Add RLS policy to prevent non-admins from updating placeholder entries
CREATE POLICY "Only admins can update placeholder producers"
ON producers
FOR UPDATE
USING (
  (is_placeholder = false OR is_placeholder IS NULL) OR has_role(auth.uid(), 'admin'::app_role)
);