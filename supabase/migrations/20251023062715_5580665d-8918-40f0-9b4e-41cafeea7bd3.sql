-- Phase 1: Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (length(event_type) <= 100),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT audit_logs_event_type_valid CHECK (event_type IN (
    'submission_verified',
    'submission_rejected',
    'payment_marked_paid',
    'producer_created',
    'producer_updated',
    'user_role_changed',
    'leaderboard_access_granted',
    'leaderboard_access_revoked',
    'maintenance_mode_toggled',
    'producer_notification_queued',
    'producer_notification_sent',
    'stripe_subscription_created',
    'stripe_subscription_cancelled',
    'moderation_action'
  ))
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_insert_authenticated" 
ON public.audit_logs FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "audit_logs_select_admin" 
ON public.audit_logs FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

COMMENT ON TABLE public.audit_logs IS 'Tracks all sensitive actions and events for security auditing';

-- Phase 2: Create moderation_logs table
CREATE TABLE IF NOT EXISTS public.moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id uuid NOT NULL,
  target_type text NOT NULL CHECK (length(target_type) <= 50),
  action text NOT NULL CHECK (length(action) <= 100),
  notes text CHECK (length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT moderation_logs_action_valid CHECK (action IN (
    'ban_user',
    'unban_user',
    'delete_submission',
    'flag_content',
    'unflag_content',
    'override_access',
    'revoke_access',
    'merge_producers',
    'hide_producer',
    'unhide_producer'
  ))
);

ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moderation_logs_insert_admin" 
ON public.moderation_logs FOR INSERT 
TO authenticated 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "moderation_logs_select_admin" 
ON public.moderation_logs FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_moderation_logs_user_id ON public.moderation_logs(user_id);
CREATE INDEX idx_moderation_logs_target_id ON public.moderation_logs(target_id);
CREATE INDEX idx_moderation_logs_created_at ON public.moderation_logs(created_at DESC);

COMMENT ON TABLE public.moderation_logs IS 'Tracks admin moderation actions for accountability';