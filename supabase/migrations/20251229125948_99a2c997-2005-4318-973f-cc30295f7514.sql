-- Enable realtime for global_call_sheets table
ALTER TABLE public.global_call_sheets REPLICA IDENTITY FULL;

-- Add to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_call_sheets;