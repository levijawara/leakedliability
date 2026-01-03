-- Fix leaderboard ranking for perfect scores (1000)
-- Perfect scores should be ranked by days with perfect score (days_clean DESC)
-- Non-perfect scores should be ranked by oldest_debt_days ASC (fewer debt days = better)

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
  p.momentum_active_until,
  p.last_closed_date
FROM producers p
WHERE p.account_status != 'banned'
  AND (p.is_placeholder = false OR p.is_placeholder IS NULL)
ORDER BY 
  calculate_pscs_score(p.id) DESC,
  -- For perfect scores (1000): rank by days clean DESC (more days with perfect score = better)
  CASE 
    WHEN calculate_pscs_score(p.id) = 1000 AND p.total_amount_owed = 0 THEN
      COALESCE(CURRENT_DATE - p.last_closed_date, 0)
    ELSE
      NULL
  END DESC NULLS LAST,
  -- For non-perfect scores: rank by oldest_debt_days ASC (fewer debt days = better)
  CASE 
    WHEN calculate_pscs_score(p.id) != 1000 THEN
      COALESCE(p.oldest_debt_days, 0)
    ELSE
      NULL
  END ASC NULLS LAST;

COMMENT ON VIEW public_leaderboard IS 
  'Public leaderboard ranked by PSCS score. Perfect scores (1000) are ranked by days with perfect score. Non-perfect scores are ranked by oldest debt days.';

