-- Recreate public_leaderboard view to include sub_name
DROP VIEW IF EXISTS public_leaderboard;

CREATE VIEW public_leaderboard AS
SELECT 
  p.id AS producer_id,
  p.name AS producer_name,
  p.company AS company_name,
  p.sub_name,
  p.pscs_score,
  p.total_amount_owed,
  p.oldest_debt_date,
  p.oldest_debt_days,
  p.total_crew_owed,
  p.total_vendors_owed,
  p.total_jobs_owed,
  p.total_cities_owed,
  p.momentum_active_until,
  p.paid_jobs_count,
  p.paid_crew_count
FROM producers p
WHERE p.verification_status = 'verified'
  AND p.account_status = 'active';