-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to trigger queue processor when sheets are queued
CREATE OR REPLACE FUNCTION trigger_parse_queue_processor()
RETURNS TRIGGER AS $$
DECLARE
  response_id bigint;
BEGIN
  -- Only trigger for newly queued sheets
  IF NEW.status = 'queued' THEN
    -- Call the queue-processor edge function
    SELECT extensions.http_post(
      url := 'https://blpbeopmdfahiosglomx.supabase.co/functions/v1/queue-processor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscGJlb3BtZGZhaGlvc2dsb214Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NjQ0MDksImV4cCI6MjA3NTM0MDQwOX0.ItjgY5Nf68sDE6UJwB6IYH7YWp13C-9JaZ20mSEyx78'
      ),
      body := jsonb_build_object('triggered_by', 'db_trigger', 'sheet_id', NEW.id)
    ) INTO response_id;
    
    RAISE LOG '[trigger_parse_queue_processor] Triggered queue processor for sheet %, response_id: %', NEW.id, response_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on global_call_sheets
DROP TRIGGER IF EXISTS on_call_sheet_queued ON global_call_sheets;
CREATE TRIGGER on_call_sheet_queued
  AFTER INSERT ON global_call_sheets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_parse_queue_processor();