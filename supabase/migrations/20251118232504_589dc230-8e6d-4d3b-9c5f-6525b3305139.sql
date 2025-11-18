-- =====================================================
-- RING AROUND THE ROSIE - PHASE 1: DATABASE SCHEMA
-- =====================================================

-- 1. CREATE liability_chain TABLE
-- Tracks every finger-point in a debt's history
CREATE TABLE public.liability_chain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.payment_reports(id) ON DELETE CASCADE,
  accuser_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accused_name TEXT NOT NULL,
  accused_email TEXT NOT NULL,
  accused_role TEXT NOT NULL CHECK (accused_role IN ('producer', 'production_company', 'contractor', 'unknown')),
  affirmation_ip INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Audit trail
  accused_response TEXT CHECK (accused_response IN ('pending', 'accepted', 'disputed', 'redirected')) DEFAULT 'pending',
  response_at TIMESTAMPTZ,
  
  UNIQUE(report_id, accused_email) -- Prevent duplicate accusations in same chain
);

CREATE INDEX idx_liability_chain_report ON public.liability_chain(report_id);
CREATE INDEX idx_liability_chain_email ON public.liability_chain(accused_email);
CREATE INDEX idx_liability_chain_response ON public.liability_chain(accused_response);

-- RLS for liability_chain
ALTER TABLE public.liability_chain ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all liability chains"
ON public.liability_chain FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own liability chains"
ON public.liability_chain FOR SELECT
USING (
  auth.uid() = accuser_id 
  OR accused_email = (SELECT email FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Authenticated users can create liability entries"
ON public.liability_chain FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update liability chain responses"
ON public.liability_chain FOR UPDATE
USING (true);

-- 2. CREATE liability_history TABLE
-- Full audit log for legal protection & defamation defense
CREATE TABLE public.liability_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.payment_reports(id) ON DELETE CASCADE,
  previous_name TEXT,
  previous_email TEXT,
  new_name TEXT NOT NULL,
  new_email TEXT NOT NULL,
  triggered_by UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('initial_report', 'liability_redirect', 'loop_detected', 'accepted_responsibility', 'admin_override', 'dispute_filed')),
  affirmation_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_liability_history_report ON public.liability_history(report_id);
CREATE INDEX idx_liability_history_action ON public.liability_history(action_type);
CREATE INDEX idx_liability_history_date ON public.liability_history(created_at);

-- RLS for liability_history
ALTER TABLE public.liability_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view liability history"
ON public.liability_history FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert liability history"
ON public.liability_history FOR INSERT
WITH CHECK (true);

-- 3. CREATE liability_claim_tokens TABLE
-- Magic links for anonymous liability handling
CREATE TABLE public.liability_claim_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.payment_reports(id) ON DELETE CASCADE,
  accused_email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_liability_tokens_token ON public.liability_claim_tokens(token);
CREATE INDEX idx_liability_tokens_report ON public.liability_claim_tokens(report_id);
CREATE INDEX idx_liability_tokens_email ON public.liability_claim_tokens(accused_email);

-- RLS for liability_claim_tokens
ALTER TABLE public.liability_claim_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view valid tokens"
ON public.liability_claim_tokens FOR SELECT
USING (expires_at > NOW() AND used_at IS NULL);

CREATE POLICY "System can create tokens"
ON public.liability_claim_tokens FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update tokens"
ON public.liability_claim_tokens FOR UPDATE
USING (true);

-- 4. MODIFY payment_reports TABLE
-- Add liability chain tracking columns
ALTER TABLE public.payment_reports
ADD COLUMN current_liable_name TEXT,
ADD COLUMN current_liable_email TEXT,
ADD COLUMN is_in_liability_chain BOOLEAN DEFAULT FALSE,
ADD COLUMN liability_chain_length INTEGER DEFAULT 0,
ADD COLUMN liability_loop_detected BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_payment_reports_liability ON public.payment_reports(is_in_liability_chain);
CREATE INDEX idx_payment_reports_loop ON public.payment_reports(liability_loop_detected);

-- 5. CREATE AUTO-LOOP DETECTION TRIGGER
-- Automatically detect when liability loops back to someone already in chain
CREATE OR REPLACE FUNCTION public.detect_liability_loop()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loop_exists BOOLEAN;
  original_entry RECORD;
BEGIN
  -- Check if accused email already exists in chain (excluding current insert)
  SELECT EXISTS(
    SELECT 1 FROM liability_chain
    WHERE report_id = NEW.report_id
    AND accused_email = NEW.accused_email
    AND id != NEW.id
  ) INTO loop_exists;
  
  IF loop_exists THEN
    -- Get original (first) entry in chain
    SELECT * INTO original_entry
    FROM liability_chain
    WHERE report_id = NEW.report_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Update payment report to revert to original accused party
    UPDATE payment_reports SET
      current_liable_name = original_entry.accused_name,
      current_liable_email = original_entry.accused_email,
      liability_loop_detected = TRUE,
      updated_at = NOW()
    WHERE id = NEW.report_id;
    
    -- Log loop detection to history
    INSERT INTO liability_history (
      report_id, 
      action_type, 
      new_name, 
      new_email,
      previous_name,
      previous_email
    ) VALUES (
      NEW.report_id,
      'loop_detected',
      original_entry.accused_name,
      original_entry.accused_email,
      NEW.accused_name,
      NEW.accused_email
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_liability_chain_insert
AFTER INSERT ON liability_chain
FOR EACH ROW
EXECUTE FUNCTION detect_liability_loop();

-- 6. CREATE HELPER FUNCTION to update liability chain length
CREATE OR REPLACE FUNCTION public.update_liability_chain_length()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the chain length count
  UPDATE payment_reports
  SET liability_chain_length = (
    SELECT COUNT(*) FROM liability_chain WHERE report_id = NEW.report_id
  )
  WHERE id = NEW.report_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_liability_chain_length_update
AFTER INSERT ON liability_chain
FOR EACH ROW
EXECUTE FUNCTION update_liability_chain_length();