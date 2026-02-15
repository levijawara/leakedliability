-- Wipe the Project Timeline slate clean.
-- Does NOT touch user_call_sheets (user libraries) or global_call_sheets (Alexandria).
DELETE FROM public.production_instances;
