-- Add UNIQUE constraint on report_id to prevent duplicate reports
ALTER TABLE payment_reports 
ADD CONSTRAINT payment_reports_report_id_unique UNIQUE (report_id);