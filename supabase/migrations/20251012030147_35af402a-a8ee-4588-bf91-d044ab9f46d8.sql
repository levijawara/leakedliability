-- Create trigger for automatic producer stats updates (if not exists)
DROP TRIGGER IF EXISTS trigger_update_producer_stats ON public.payment_reports;
CREATE TRIGGER trigger_update_producer_stats
AFTER INSERT OR UPDATE OR DELETE ON public.payment_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_producer_stats_complete();

-- Create trigger for automatic file cleanup on submission deletion (if not exists)
DROP TRIGGER IF EXISTS trigger_delete_submission_files ON public.submissions;
CREATE TRIGGER trigger_delete_submission_files
BEFORE DELETE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.delete_submission_files();

-- Create trigger for automatic days_overdue calculation (if not exists)
DROP TRIGGER IF EXISTS trigger_calculate_days_overdue ON public.payment_reports;
CREATE TRIGGER trigger_calculate_days_overdue
BEFORE INSERT OR UPDATE ON public.payment_reports
FOR EACH ROW
EXECUTE FUNCTION public.calculate_days_overdue();

-- Create trigger for automatic oldest_debt_days calculation (if not exists)
DROP TRIGGER IF EXISTS trigger_calculate_oldest_debt_days ON public.producers;
CREATE TRIGGER trigger_calculate_oldest_debt_days
BEFORE INSERT OR UPDATE ON public.producers
FOR EACH ROW
EXECUTE FUNCTION public.calculate_oldest_debt_days();