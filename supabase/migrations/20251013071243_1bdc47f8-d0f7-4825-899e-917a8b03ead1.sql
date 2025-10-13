-- Phase 0: Enable maintenance mode temporarily
UPDATE public.site_settings 
SET maintenance_mode = true, 
    maintenance_message = 'We are performing system maintenance. Please check back shortly.',
    updated_at = now()
WHERE id = (SELECT id FROM public.site_settings LIMIT 1);

-- Phase 1: Fix RLS recursion on user_roles
-- Drop and recreate the problematic policy to use has_role function
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Phase 4: Server-side validation triggers

-- 1) Validate admin notes length
CREATE OR REPLACE FUNCTION public.validate_admin_notes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.admin_notes IS NOT NULL AND length(NEW.admin_notes) > 2000 THEN
    RAISE EXCEPTION 'Admin notes must be 2000 characters or less';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS submissions_validate_admin_notes ON public.submissions;
CREATE TRIGGER submissions_validate_admin_notes
BEFORE UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.validate_admin_notes();

-- 2) Validate maintenance message length
CREATE OR REPLACE FUNCTION public.validate_maintenance_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.maintenance_message IS NOT NULL AND length(NEW.maintenance_message) > 500 THEN
    RAISE EXCEPTION 'Maintenance message must be 500 characters or less';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS site_settings_validate_message ON public.site_settings;
CREATE TRIGGER site_settings_validate_message
BEFORE INSERT OR UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.validate_maintenance_message();

-- 3) Validate payment report dates (no future dates)
CREATE OR REPLACE FUNCTION public.validate_payment_report_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_date IS NOT NULL AND NEW.payment_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Payment date cannot be in the future';
  END IF;
  IF NEW.closed_date IS NOT NULL AND NEW.closed_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Closed date cannot be in the future';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_reports_validate_dates ON public.payment_reports;
CREATE TRIGGER payment_reports_validate_dates
BEFORE INSERT OR UPDATE ON public.payment_reports
FOR EACH ROW EXECUTE FUNCTION public.validate_payment_report_dates();