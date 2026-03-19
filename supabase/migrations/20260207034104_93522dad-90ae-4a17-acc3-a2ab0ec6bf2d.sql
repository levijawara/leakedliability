CREATE OR REPLACE FUNCTION public.validate_admin_notes()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.admin_notes IS NOT NULL AND length(NEW.admin_notes) > 10000 THEN
    RAISE EXCEPTION 'Admin notes must be 10000 characters or less';
  END IF;
  RETURN NEW;
END;
$$;