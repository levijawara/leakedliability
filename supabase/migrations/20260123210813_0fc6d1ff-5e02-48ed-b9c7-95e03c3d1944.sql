-- Add NOVA profile URL column to crew_contacts
ALTER TABLE public.crew_contacts 
ADD COLUMN nova_profile_url TEXT;

COMMENT ON COLUMN public.crew_contacts.nova_profile_url IS 'NOVA platform profile URL (itsnova.com)';