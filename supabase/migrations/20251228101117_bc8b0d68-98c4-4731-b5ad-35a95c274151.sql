-- Add missing columns to call_sheets table for parser reliability

-- Add error_message column for storing parsing errors
ALTER TABLE public.call_sheets 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add updated_at column for watchdog detection
ALTER TABLE public.call_sheets 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_call_sheets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_call_sheets_updated_at ON public.call_sheets;
CREATE TRIGGER trigger_call_sheets_updated_at
  BEFORE UPDATE ON public.call_sheets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_call_sheets_updated_at();

-- Create index for watchdog query performance
CREATE INDEX IF NOT EXISTS idx_call_sheets_status_updated_at 
ON public.call_sheets (status, updated_at)
WHERE status = 'parsing';