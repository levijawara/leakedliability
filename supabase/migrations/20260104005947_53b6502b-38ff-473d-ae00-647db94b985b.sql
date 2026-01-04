-- Add arena columns to payment_reports
ALTER TABLE public.payment_reports 
ADD COLUMN IF NOT EXISTS arena_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS arena_locked boolean DEFAULT false;

-- Create liability_arena_participants table
CREATE TABLE public.liability_arena_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.payment_reports(id) ON DELETE CASCADE,
  user_id uuid,
  participant_name text NOT NULL,
  participant_email text NOT NULL,
  is_admin boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create liability_arena_messages table
CREATE TABLE public.liability_arena_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.payment_reports(id) ON DELETE CASCADE,
  user_id uuid,
  participant_name text NOT NULL,
  participant_email text NOT NULL,
  message_text text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create liability_arena_redirects table
CREATE TABLE public.liability_arena_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.payment_reports(id) ON DELETE CASCADE,
  from_participant_id uuid,
  from_participant_name text NOT NULL,
  from_participant_email text NOT NULL,
  to_name text NOT NULL,
  to_email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.liability_arena_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liability_arena_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liability_arena_redirects ENABLE ROW LEVEL SECURITY;

-- RLS policies for liability_arena_participants
CREATE POLICY "Admins can manage all arena participants"
ON public.liability_arena_participants FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view arena participants for their reports"
ON public.liability_arena_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.payment_reports pr
    WHERE pr.id = liability_arena_participants.report_id
    AND (pr.reporter_id = auth.uid() OR pr.current_liable_email IN (
      SELECT email FROM public.profiles WHERE user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Authenticated users can join arenas"
ON public.liability_arena_participants FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS policies for liability_arena_messages
CREATE POLICY "Admins can manage all arena messages"
ON public.liability_arena_messages FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Participants can view arena messages"
ON public.liability_arena_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.liability_arena_participants lap
    WHERE lap.report_id = liability_arena_messages.report_id
    AND (lap.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Participants can send arena messages"
ON public.liability_arena_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.liability_arena_participants lap
    WHERE lap.report_id = liability_arena_messages.report_id
    AND lap.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- RLS policies for liability_arena_redirects
CREATE POLICY "Admins can manage all arena redirects"
ON public.liability_arena_redirects FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Participants can view arena redirects"
ON public.liability_arena_redirects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.liability_arena_participants lap
    WHERE lap.report_id = liability_arena_redirects.report_id
    AND (lap.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Participants can create arena redirects"
ON public.liability_arena_redirects FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.liability_arena_participants lap
    WHERE lap.report_id = liability_arena_redirects.report_id
    AND lap.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.liability_arena_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.liability_arena_participants;

-- Create indexes for performance
CREATE INDEX idx_arena_participants_report_id ON public.liability_arena_participants(report_id);
CREATE INDEX idx_arena_messages_report_id ON public.liability_arena_messages(report_id);
CREATE INDEX idx_arena_redirects_report_id ON public.liability_arena_redirects(report_id);