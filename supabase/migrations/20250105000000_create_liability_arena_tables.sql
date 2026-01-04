-- =====================================================
-- LIABILITY ARENA - DATABASE SCHEMA
-- =====================================================

-- 1. CREATE liability_arena_participants TABLE
-- Tracks all users involved in an arena instance
CREATE TABLE public.liability_arena_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.payment_reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  participant_name TEXT NOT NULL, -- Name they entered (may not match profile)
  participant_email TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id, participant_email) -- Prevent duplicate participants
);

CREATE INDEX idx_arena_participants_report ON public.liability_arena_participants(report_id);
CREATE INDEX idx_arena_participants_user ON public.liability_arena_participants(user_id);
CREATE INDEX idx_arena_participants_email ON public.liability_arena_participants(participant_email);

-- RLS for liability_arena_participants
ALTER TABLE public.liability_arena_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all participants"
ON public.liability_arena_participants FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Participants can view their own arena"
ON public.liability_arena_participants FOR SELECT
USING (
  auth.uid() = user_id 
  OR participant_email = (SELECT email FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Authenticated users can join arenas"
ON public.liability_arena_participants FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own participation"
ON public.liability_arena_participants FOR UPDATE
USING (auth.uid() = user_id);

-- 2. CREATE liability_arena_messages TABLE
-- Stores all chat messages in the arena
CREATE TABLE public.liability_arena_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.payment_reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  participant_name TEXT NOT NULL, -- Name at time of message
  participant_email TEXT NOT NULL,
  message_text TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_arena_messages_report ON public.liability_arena_messages(report_id);
CREATE INDEX idx_arena_messages_user ON public.liability_arena_messages(user_id);
CREATE INDEX idx_arena_messages_created ON public.liability_arena_messages(created_at DESC);

-- RLS for liability_arena_messages
ALTER TABLE public.liability_arena_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all messages"
ON public.liability_arena_messages FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Participants can view their arena messages"
ON public.liability_arena_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.liability_arena_participants
    WHERE report_id = liability_arena_messages.report_id
    AND (
      user_id = auth.uid()
      OR participant_email = (SELECT email FROM profiles WHERE user_id = auth.uid())
    )
  )
);

CREATE POLICY "Participants can send messages"
ON public.liability_arena_messages FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.liability_arena_participants
    WHERE report_id = liability_arena_messages.report_id
    AND (
      user_id = auth.uid()
      OR participant_email = (SELECT email FROM profiles WHERE user_id = auth.uid())
    )
  )
);

-- 3. CREATE liability_arena_redirects TABLE
-- Tracks redirects that happen within the arena
CREATE TABLE public.liability_arena_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.payment_reports(id) ON DELETE CASCADE,
  from_participant_id UUID REFERENCES public.liability_arena_participants(id) ON DELETE SET NULL,
  from_participant_name TEXT NOT NULL,
  from_participant_email TEXT NOT NULL,
  to_name TEXT NOT NULL,
  to_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_arena_redirects_report ON public.liability_arena_redirects(report_id);
CREATE INDEX idx_arena_redirects_from ON public.liability_arena_redirects(from_participant_id);

-- RLS for liability_arena_redirects
ALTER TABLE public.liability_arena_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all redirects"
ON public.liability_arena_redirects FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Participants can view redirects in their arena"
ON public.liability_arena_redirects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.liability_arena_participants
    WHERE report_id = liability_arena_redirects.report_id
    AND (
      user_id = auth.uid()
      OR participant_email = (SELECT email FROM profiles WHERE user_id = auth.uid())
    )
  )
);

CREATE POLICY "Participants can create redirects"
ON public.liability_arena_redirects FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.liability_arena_participants
    WHERE report_id = liability_arena_redirects.report_id
    AND (
      user_id = auth.uid()
      OR participant_email = (SELECT email FROM profiles WHERE user_id = auth.uid())
    )
  )
);

-- 4. ADD arena fields to payment_reports
ALTER TABLE public.payment_reports
ADD COLUMN IF NOT EXISTS arena_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS arena_locked BOOLEAN DEFAULT FALSE, -- Set to true when debt is paid
ADD COLUMN IF NOT EXISTS arena_transcript_pdf_url TEXT; -- URL to generated PDF transcript

CREATE INDEX IF NOT EXISTS idx_payment_reports_arena_active ON public.payment_reports(arena_active);
CREATE INDEX IF NOT EXISTS idx_payment_reports_arena_locked ON public.payment_reports(arena_locked);

-- Function to update last_seen_at for participants
CREATE OR REPLACE FUNCTION public.update_arena_participant_last_seen()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.liability_arena_participants
  SET last_seen_at = NOW()
  WHERE report_id = NEW.report_id
  AND (user_id = NEW.user_id OR participant_email = NEW.participant_email);
  RETURN NEW;
END;
$$;

-- Trigger to update last_seen when message is sent
CREATE TRIGGER update_participant_last_seen_on_message
AFTER INSERT ON public.liability_arena_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_arena_participant_last_seen();

