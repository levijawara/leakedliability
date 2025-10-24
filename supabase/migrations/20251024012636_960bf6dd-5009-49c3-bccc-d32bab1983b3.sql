-- Add share_link column to producer_self_reports
ALTER TABLE public.producer_self_reports
  ADD COLUMN IF NOT EXISTS share_link TEXT;

COMMENT ON COLUMN public.producer_self_reports.share_link IS
'Unique confirmation URL that producers can share with crew/vendors to corroborate their self-report.';

-- Auto-generate share link trigger function
CREATE OR REPLACE FUNCTION public.generate_self_report_share_link()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.share_link := 
    'https://leakedliability.com/confirm?r=' || NEW.id || '&p=' || NEW.producer_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_self_report_link ON public.producer_self_reports;

CREATE TRIGGER trg_generate_self_report_link
BEFORE INSERT ON public.producer_self_reports
FOR EACH ROW
EXECUTE FUNCTION public.generate_self_report_share_link();

-- RPC function for corroboration (public access)
CREATE OR REPLACE FUNCTION public.increment_corroboration(report_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.producer_self_reports
  SET corroboration_count = corroboration_count + 1
  WHERE id = report_id;
END;
$$;

-- Grant public execute permission for anonymous corroboration
GRANT EXECUTE ON FUNCTION public.increment_corroboration(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_corroboration(UUID) TO authenticated;