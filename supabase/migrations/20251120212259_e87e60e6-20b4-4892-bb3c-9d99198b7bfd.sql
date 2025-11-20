-- Create manual_email_logs table for admin email audit trail
CREATE TABLE IF NOT EXISTS public.manual_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  producer_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_manual_email_logs_admin_id ON public.manual_email_logs(admin_id);
CREATE INDEX idx_manual_email_logs_producer_id ON public.manual_email_logs(producer_id);
CREATE INDEX idx_manual_email_logs_sent_at ON public.manual_email_logs(sent_at DESC);
CREATE INDEX idx_manual_email_logs_status ON public.manual_email_logs(status);

-- Enable RLS
ALTER TABLE public.manual_email_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all manual email logs
CREATE POLICY "Admins can view manual email logs"
  ON public.manual_email_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert logs (via service role in Edge Function)
CREATE POLICY "System can insert manual email logs"
  ON public.manual_email_logs FOR INSERT
  WITH CHECK (true);
