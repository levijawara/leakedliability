-- Add crew_size column for Project Timeline CREW SIZE display
ALTER TABLE public.production_instances
ADD COLUMN IF NOT EXISTS crew_size INTEGER;

COMMENT ON COLUMN public.production_instances.crew_size IS 'Tally of crew/roles from call sheet. Displayed in Project Timeline CREW SIZE column.';
