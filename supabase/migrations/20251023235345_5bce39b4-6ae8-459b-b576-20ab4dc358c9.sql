-- ✅ Mid-Phase Security & UX Fixes (Fixes #2-#6)

-- ✅ 2️⃣ Create site_notices table for platform-wide notices
CREATE TABLE IF NOT EXISTS public.site_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  visible_to TEXT NOT NULL DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on site_notices
ALTER TABLE public.site_notices ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view notices
CREATE POLICY "Anyone can view site notices"
  ON public.site_notices
  FOR SELECT
  USING (true);

-- Only admins can manage notices
CREATE POLICY "Admins can manage notices"
  ON public.site_notices
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Insert Confirmation Cash validity notice
INSERT INTO public.site_notices (title, content, visible_to)
VALUES (
  'Confirmation Cash Validity',
  'Confirmation Cash balances remain valid for as long as the Leaked Liability™ platform is operational. They hold no cash value outside the LL ecosystem and can only be redeemed for in-platform purposes such as merchandise, services, or other LL-authorized uses.',
  'all'
)
ON CONFLICT DO NOTHING;

-- ✅ 3️⃣ Add clarity comment to confirmation_pool
COMMENT ON TABLE public.confirmation_pool IS
'Admin-only internal pool representing the total in-platform "Confirmation Cash" reservoir. Initially seeded with $1,000 of simulated funds. Users cannot redeem balances for cash; usage is limited to in-platform functions such as merchandise redemption.';

-- ✅ 4️⃣ Add public_leaderboard_ready flag to site_settings
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS public_leaderboard_ready BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.site_settings.public_leaderboard_ready IS
'When TRUE, leaderboard names become visible to all users. When FALSE, names are blurred for non-admins. Admins always see unblurred names regardless of this flag.';

-- ✅ 6️⃣ Restrict confirmation_pool visibility to admins only
DROP POLICY IF EXISTS "Anyone can view pool balance" ON public.confirmation_pool;

CREATE POLICY "Admins view pool only"
  ON public.confirmation_pool
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

COMMENT ON POLICY "Admins view pool only" ON public.confirmation_pool IS
'Restricts confirmation pool visibility to administrators. Hides balance from all public or non-admin views. Frontend does not query this table except in admin dashboard.';