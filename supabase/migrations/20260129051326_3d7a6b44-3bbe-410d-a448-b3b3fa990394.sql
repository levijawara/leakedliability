-- Create nova_master_identities table for storing scraped NOVA profiles
CREATE TABLE public.nova_master_identities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username text NOT NULL UNIQUE,
  profile_url text NOT NULL,
  full_name text NOT NULL,
  normalized_name text NOT NULL,
  roles text[] DEFAULT '{}'::text[],
  sources text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index for fast username lookups
CREATE INDEX idx_nova_master_identities_username ON public.nova_master_identities(username);
CREATE INDEX idx_nova_master_identities_normalized_name ON public.nova_master_identities(normalized_name);

-- Enable RLS
ALTER TABLE public.nova_master_identities ENABLE ROW LEVEL SECURITY;

-- Admins can manage all records
CREATE POLICY "Admins can manage nova master identities"
  ON public.nova_master_identities
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can read (for matching)
CREATE POLICY "Authenticated users can read nova master identities"
  ON public.nova_master_identities
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert (for confirmed matches from IG Matching portal)
CREATE POLICY "Authenticated users can insert nova master identities"
  ON public.nova_master_identities
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update (for merging data)
CREATE POLICY "Authenticated users can update nova master identities"
  ON public.nova_master_identities
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);