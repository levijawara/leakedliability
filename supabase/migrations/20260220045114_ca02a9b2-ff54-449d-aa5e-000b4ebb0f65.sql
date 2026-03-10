
-- ============================================================
-- Phase 1: SECURITY DEFINER RPCs for leaderboard data gating
-- ============================================================

-- 1. get_leaderboard_data: returns full leaderboard only if entitled
CREATE OR REPLACE FUNCTION public.get_leaderboard_data(p_delinquent_only BOOLEAN DEFAULT FALSE)
RETURNS TABLE (
  producer_id UUID,
  producer_name TEXT,
  company_name TEXT,
  sub_name TEXT,
  pscs_score NUMERIC,
  total_amount_owed NUMERIC,
  oldest_debt_date DATE,
  oldest_debt_days INTEGER,
  total_crew_owed INTEGER,
  total_vendors_owed INTEGER,
  total_jobs_owed INTEGER,
  total_cities_owed INTEGER,
  paid_jobs_count INTEGER,
  paid_crew_count INTEGER,
  momentum_active_until TIMESTAMPTZ,
  last_closed_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_has_access BOOLEAN := FALSE;
BEGIN
  v_uid := auth.uid();

  -- Must be authenticated
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  -- Priority 1: Global free access
  IF EXISTS (SELECT 1 FROM leaderboard_config WHERE free_access_enabled = TRUE LIMIT 1) THEN
    v_has_access := TRUE;
  END IF;

  -- Priority 2: Admin role
  IF NOT v_has_access AND has_role(v_uid, 'admin') THEN
    v_has_access := TRUE;
  END IF;

  -- Priority 3: Active entitlement (active or grace_period)
  IF NOT v_has_access AND EXISTS (
    SELECT 1 FROM user_entitlements
    WHERE user_id = v_uid
      AND entitlement_type = 'leaderboard'
      AND status IN ('active', 'grace_period')
    LIMIT 1
  ) THEN
    v_has_access := TRUE;
  END IF;

  -- No access: return empty
  IF NOT v_has_access THEN
    RETURN;
  END IF;

  -- Return leaderboard data (same as public_leaderboard view)
  RETURN QUERY
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
    WHERE p.account_status <> 'banned'
      AND (p.is_placeholder = FALSE OR p.is_placeholder IS NULL)
      AND (NOT p_delinquent_only OR p.total_amount_owed > 0)
    ORDER BY
      calculate_pscs_score(p.id) DESC,
      CASE
        WHEN calculate_pscs_score(p.id) = 1000 AND p.total_amount_owed = 0
        THEN COALESCE(CURRENT_DATE - p.last_closed_date, 0)
        ELSE NULL
      END DESC NULLS LAST,
      CASE
        WHEN calculate_pscs_score(p.id) <> 1000
        THEN COALESCE(p.oldest_debt_days, 0)
        ELSE NULL
      END;
END;
$$;

-- 2. get_leaderboard_debt_check: returns minimal debt info for search enrichment
CREATE OR REPLACE FUNCTION public.get_leaderboard_debt_check(p_producer_ids UUID[])
RETURNS TABLE (
  producer_id UUID,
  total_amount_owed NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
BEGIN
  v_uid := auth.uid();

  -- Must be authenticated
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  -- This returns minimal debt info (2 columns only) for authenticated users.
  -- No subscription check needed - debt status is publicly relevant for search enrichment.
  RETURN QUERY
    SELECT p.id AS producer_id, p.total_amount_owed
    FROM producers p
    WHERE p.id = ANY(p_producer_ids)
      AND p.account_status <> 'banned'
      AND (p.is_placeholder = FALSE OR p.is_placeholder IS NULL);
END;
$$;

-- 3. Revoke direct SELECT on the view
REVOKE SELECT ON public_leaderboard FROM authenticated;

-- 4. Grant EXECUTE on both functions
GRANT EXECUTE ON FUNCTION public.get_leaderboard_data(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_debt_check(UUID[]) TO authenticated;
