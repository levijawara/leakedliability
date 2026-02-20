DROP VIEW IF EXISTS public.public_payment_reports;

CREATE VIEW public.public_payment_reports AS
SELECT
  id,
  days_overdue,
  producer_id,
  amount_owed,
  invoice_date,
  payment_date,
  verified,
  created_at,
  updated_at,
  closed_date,
  project_name,
  reporter_type,
  report_id,
  city,
  status
FROM payment_reports
WHERE verified = true;

GRANT SELECT ON public.public_payment_reports TO anon;
GRANT SELECT ON public.public_payment_reports TO authenticated;