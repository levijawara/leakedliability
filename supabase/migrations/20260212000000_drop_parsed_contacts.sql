-- LL 2.0: Remove parsed_contacts and contacts_extracted from global_call_sheets
-- PDF is the human-reviewable source of truth. production_instances holds canonical_producers for leaderboard.

ALTER TABLE public.global_call_sheets DROP COLUMN IF EXISTS parsed_contacts;
ALTER TABLE public.global_call_sheets DROP COLUMN IF EXISTS contacts_extracted;
