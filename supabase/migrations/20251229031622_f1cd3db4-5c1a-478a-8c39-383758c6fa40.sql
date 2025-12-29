-- Attach the existing update function to call_sheets table
CREATE TRIGGER update_call_sheets_updated_at_trigger
  BEFORE UPDATE ON public.call_sheets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_call_sheets_updated_at();