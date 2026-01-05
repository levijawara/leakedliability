-- Create ig_master_identities table - global master identity registry for IG handles
CREATE TABLE ig_master_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  instagram TEXT NOT NULL UNIQUE,
  roles TEXT[] DEFAULT '{}',
  phones TEXT[] DEFAULT '{}',
  emails TEXT[] DEFAULT '{}',
  sources TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX idx_ig_master_identities_normalized_name ON ig_master_identities(normalized_name);
CREATE INDEX idx_ig_master_identities_instagram ON ig_master_identities(instagram);
CREATE INDEX idx_ig_master_identities_phones ON ig_master_identities USING GIN(phones);
CREATE INDEX idx_ig_master_identities_emails ON ig_master_identities USING GIN(emails);

-- RLS Policies
ALTER TABLE ig_master_identities ENABLE ROW LEVEL SECURITY;

-- Admins can manage all records
CREATE POLICY "Admins can manage master identities" ON ig_master_identities
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can read for matching
CREATE POLICY "Authenticated users can read master identities" ON ig_master_identities
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert (for syncing their matches)
CREATE POLICY "Authenticated users can insert master identities" ON ig_master_identities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update (for merging data)
CREATE POLICY "Authenticated users can update master identities" ON ig_master_identities
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Updated_at trigger
CREATE TRIGGER update_ig_master_identities_updated_at
  BEFORE UPDATE ON ig_master_identities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();