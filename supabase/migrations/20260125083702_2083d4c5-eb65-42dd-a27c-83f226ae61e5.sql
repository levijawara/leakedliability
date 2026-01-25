
-- Create temporary staging table for IG enrichment
CREATE TABLE IF NOT EXISTS public.ig_enrichment_staging (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  instagram TEXT,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ig_staging_phone ON public.ig_enrichment_staging (phone);
CREATE INDEX IF NOT EXISTS idx_ig_staging_email ON public.ig_enrichment_staging (email);
CREATE INDEX IF NOT EXISTS idx_ig_staging_processed ON public.ig_enrichment_staging (processed);
