-- Drop and recreate the audit_logs event_type constraint to include crew_contact events
ALTER TABLE public.audit_logs 
DROP CONSTRAINT IF EXISTS audit_logs_event_type_valid;

ALTER TABLE public.audit_logs 
ADD CONSTRAINT audit_logs_event_type_valid 
CHECK (event_type = ANY (ARRAY[
  'submission_verified'::text, 
  'submission_rejected'::text, 
  'payment_marked_paid'::text, 
  'producer_created'::text, 
  'producer_updated'::text, 
  'user_role_changed'::text, 
  'leaderboard_access_granted'::text, 
  'leaderboard_access_revoked'::text, 
  'maintenance_mode_toggled'::text, 
  'producer_notification_queued'::text, 
  'producer_notification_sent'::text, 
  'stripe_subscription_created'::text, 
  'stripe_subscription_cancelled'::text, 
  'moderation_action'::text,
  -- New crew_contact events
  'crew_contact_insert'::text,
  'crew_contact_update'::text,
  'crew_contact_delete'::text,
  -- Ban events
  'ban_account'::text,
  'revoke_ban'::text
]));