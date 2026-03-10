-- Fix heat score to use unpaid_needs_proof/free_labor instead of 'never'
-- User UI only has Yes (paid) / No (unpaid_needs_proof). No 'waiting' or 'never'.
CREATE OR REPLACE FUNCTION public.calculate_call_sheet_heat_score(sheet_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  paid_cnt INT := 0;
  never_cnt INT := 0;
  total_responses INT := 0;
  raw_score NUMERIC;
  heat_score NUMERIC;
BEGIN
  -- Count responses: paid vs unpaid (unpaid_needs_proof, free_labor)
  SELECT 
    COUNT(*) FILTER (WHERE payment_status = 'paid'),
    COUNT(*) FILTER (WHERE payment_status IN ('unpaid_needs_proof', 'free_labor'))
  INTO paid_cnt, never_cnt
  FROM user_call_sheets
  WHERE global_call_sheet_id = sheet_id;
  
  total_responses := paid_cnt + never_cnt;
  
  IF total_responses = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Formula: (never × 1.0) - (paid × 0.25) / total
  raw_score := (never_cnt * 1.0) - (paid_cnt * 0.25);
  heat_score := raw_score / total_responses;
  
  -- Upsert heat metrics (waiting_count stays 0 for schema compatibility)
  INSERT INTO call_sheet_heat_metrics (
    global_call_sheet_id, total_responses, paid_count, waiting_count, 
    never_paid_count, unanswered_count, heat_score, updated_at
  ) VALUES (
    sheet_id, total_responses, paid_cnt, 0, 
    never_cnt, 0, heat_score, NOW()
  )
  ON CONFLICT (global_call_sheet_id) DO UPDATE SET
    total_responses = EXCLUDED.total_responses,
    paid_count = EXCLUDED.paid_count,
    waiting_count = 0,
    never_paid_count = EXCLUDED.never_paid_count,
    unanswered_count = 0,
    heat_score = EXCLUDED.heat_score,
    updated_at = NOW();
  
  RETURN heat_score;
END;
$$;
