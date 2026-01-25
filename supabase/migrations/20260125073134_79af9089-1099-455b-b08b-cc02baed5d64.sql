-- Fix mutable search_path on trigger_parse_queue_processor function
CREATE OR REPLACE FUNCTION public.trigger_parse_queue_processor()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  response_id bigint;
BEGIN
  -- Only trigger for newly queued sheets
  IF NEW.status = 'queued' THEN
    -- Call the queue-processor edge function using correct pg_net syntax
    -- Parameters: url (text), body (jsonb), headers (jsonb)
    SELECT net.http_post(
      'https://blpbeopmdfahiosglomx.supabase.co/functions/v1/queue-processor',
      jsonb_build_object('triggered_by', 'db_trigger', 'sheet_id', NEW.id),
      jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscGJlb3BtZGZhaGlvc2dsb214Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NjQ0MDksImV4cCI6MjA3NTM0MDQwOX0.ItjgY5Nf68sDE6UJwB6IYH7YWp13C-9JaZ20mSEyx78'
      )
    ) INTO response_id;
    
    RAISE LOG '[trigger_parse_queue_processor] Triggered queue processor for sheet %, response_id: %', NEW.id, response_id;
  END IF;
  
  RETURN NEW;
END;
$function$;