-- Create user_ig_map table for per-user IG handle associations
CREATE TABLE IF NOT EXISTS public.user_ig_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  ig_handle TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on user_id + normalized name
CREATE UNIQUE INDEX idx_user_ig_map_unique ON public.user_ig_map(user_id, LOWER(TRIM(name)));

-- Enable RLS
ALTER TABLE public.user_ig_map ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own IG map entries
CREATE POLICY "Users manage their own IG map" ON public.user_ig_map
  FOR ALL USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_user_ig_map_updated_at
  BEFORE UPDATE ON public.user_ig_map
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();