-- Add toggle to site_settings table
ALTER TABLE site_settings 
ADD COLUMN send_producer_notifications BOOLEAN DEFAULT true;

-- Create queued_producer_notifications table
CREATE TABLE queued_producer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_report_id UUID REFERENCES payment_reports(id) ON DELETE CASCADE NOT NULL,
  producer_email TEXT NOT NULL,
  report_id TEXT NOT NULL,
  amount_owed NUMERIC NOT NULL,
  days_overdue INTEGER NOT NULL,
  project_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE queued_producer_notifications ENABLE ROW LEVEL SECURITY;

-- Admin-only access policies
CREATE POLICY "Admins can view queued notifications"
  ON queued_producer_notifications FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete queued notifications"
  ON queued_producer_notifications FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert queued notifications"
  ON queued_producer_notifications FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update queued notifications"
  ON queued_producer_notifications FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));