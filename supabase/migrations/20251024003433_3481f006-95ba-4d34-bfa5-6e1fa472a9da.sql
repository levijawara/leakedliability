-- ============================================================================
-- LEAKED LIABILITY: MANUAL BAN SYSTEM
-- Admin-only ban functionality with audit trail and revocation capability
-- ============================================================================

-- 1) Create account_bans table for audit trail
CREATE TABLE IF NOT EXISTS public.account_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL,
  target_email TEXT,
  target_display_name TEXT,
  banned_by UUID NOT NULL,
  reason TEXT NOT NULL,
  appeal_email TEXT DEFAULT 'leakedliability@gmail.com',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ NULL,
  revoked_by UUID NULL,
  revoked_reason TEXT NULL
);

COMMENT ON TABLE public.account_bans IS 'Audit log for manual admin-issued bans. No automatic bans. Only admins should call ban_account RPC.';

-- 2) Create ban_pages table for centralized ban message content
CREATE TABLE IF NOT EXISTS public.ban_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Your account has been permanently banned.',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default ban message
INSERT INTO public.ban_pages (title, body)
VALUES (
  'Your account has been permanently banned.',
  '**Your account has been permanently banned.**

You''ve been flagged for one or more of the following:
• multiple *plausible, fraudulent accusations*, and/or  
• verified *fraudulent self-reports or manipulative actions*.

To protect the platform and other users, we''ve revoked your access entirely.

If you truly believe this was a mistake, you may appeal **once** — by sending a detailed explanation to **leakedliability@gmail.com**. Our admin team will review your case in due time.

If we reverse the decision, your account may be reinstated. If we don''t, the decision is final — no second appeals will be considered, and your account details will be permanently blocked and deleted.'
)
ON CONFLICT DO NOTHING;

-- 3) Add account_status column to profiles and producers
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active','suspended','banned'));

ALTER TABLE public.producers
  ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active','suspended','banned'));

-- 4) Create ban_account RPC (manual admin-only trigger)
CREATE OR REPLACE FUNCTION public.ban_account(
  _target_user_id UUID,
  _reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller UUID := auth.uid();
  target_email TEXT;
  target_name TEXT;
  ban_id UUID;
BEGIN
  -- Enforce only admins can execute
  IF NOT public.has_role(caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  -- Guardrails
  IF _target_user_id IS NULL OR _reason IS NULL OR trim(_reason) = '' THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  -- Capture target metadata before ban
  SELECT email, (legal_first_name || ' ' || legal_last_name) 
  INTO target_email, target_name 
  FROM public.profiles 
  WHERE user_id = _target_user_id 
  LIMIT 1;

  -- Insert ban record (audit trail)
  INSERT INTO public.account_bans (target_user_id, target_email, target_display_name, banned_by, reason)
  VALUES (_target_user_id, target_email, COALESCE(target_name, ''), caller, _reason)
  RETURNING id INTO ban_id;

  -- Mark user as banned in both tables
  UPDATE public.producers SET account_status = 'banned' WHERE id = _target_user_id;
  UPDATE public.profiles SET account_status = 'banned' WHERE user_id = _target_user_id;

  -- Log to audit_logs (existing table)
  INSERT INTO public.audit_logs (user_id, event_type, payload)
  VALUES (caller, 'ban_account', jsonb_build_object(
    'ban_id', ban_id,
    'target_user_id', _target_user_id,
    'target_email', target_email,
    'reason', _reason
  ));

  RETURN jsonb_build_object(
    'ok', true,
    'ban_id', ban_id,
    'target_user_id', _target_user_id,
    'target_email', target_email,
    'target_name', target_name
  );
END;
$$;

-- 5) Create revoke_ban RPC (admin-only reinstatement)
CREATE OR REPLACE FUNCTION public.revoke_ban(
  _ban_id UUID,
  _reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE 
  caller UUID := auth.uid();
  rec RECORD;
BEGIN
  IF NOT public.has_role(caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  SELECT * INTO rec FROM public.account_bans WHERE id = _ban_id AND revoked_at IS NULL LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ban_not_found_or_already_revoked';
  END IF;

  -- Mark ban as revoked
  UPDATE public.account_bans
    SET revoked_at = now(), revoked_by = caller, revoked_reason = COALESCE(_reason, '')
    WHERE id = _ban_id;

  -- Restore account status
  UPDATE public.producers SET account_status = 'active' WHERE id = rec.target_user_id;
  UPDATE public.profiles SET account_status = 'active' WHERE user_id = rec.target_user_id;

  -- Log revocation
  INSERT INTO public.audit_logs (user_id, event_type, payload)
  VALUES (caller, 'revoke_ban', jsonb_build_object(
    'ban_id', _ban_id,
    'target_user_id', rec.target_user_id
  ));

  RETURN jsonb_build_object('ok', true, 'ban_id', _ban_id, 'target_user_id', rec.target_user_id);
END;
$$;

-- 6) Helper function to fetch ban page content
CREATE OR REPLACE FUNCTION public.get_ban_page() 
RETURNS TABLE(title TEXT, body TEXT) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT title, body FROM public.ban_pages LIMIT 1;
$$;

-- 7) Enable RLS on account_bans
ALTER TABLE public.account_bans ENABLE ROW LEVEL SECURITY;

-- Admins can manage all bans
CREATE POLICY "Admins can manage bans" ON public.account_bans
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Target users can view their own ban record
CREATE POLICY "Target can view own ban" ON public.account_bans
  FOR SELECT
  USING (auth.uid() = target_user_id);

-- 8) Enable RLS on ban_pages (admin-only edit, public read)
ALTER TABLE public.ban_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ban page content" ON public.ban_pages
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can edit ban pages" ON public.ban_pages
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));