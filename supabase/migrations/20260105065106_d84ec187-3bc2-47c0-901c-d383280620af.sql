-- =============================================
-- INTELLIGENCE SYSTEM SCHEMA
-- =============================================

-- 1. Identity Groups - Probabilistic identity clustering
CREATE TABLE public.identity_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL,
  emails TEXT[] DEFAULT '{}',
  phones TEXT[] DEFAULT '{}',
  roles TEXT[] DEFAULT '{}',
  is_producer BOOLEAN DEFAULT FALSE,
  project_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for identity_groups
ALTER TABLE public.identity_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage identity groups" ON public.identity_groups
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 2. Network Nodes - Graph nodes representing identity groups
CREATE TABLE public.network_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_group_id UUID REFERENCES public.identity_groups(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  roles TEXT[] DEFAULT '{}',
  project_count INT DEFAULT 0,
  is_producer BOOLEAN DEFAULT FALSE,
  heat_context JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identity_group_id)
);

-- RLS for network_nodes
ALTER TABLE public.network_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage network nodes" ON public.network_nodes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 3. Relationship Edges - Graph edges connecting identity groups
CREATE TABLE public.relationship_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_group_id UUID REFERENCES public.identity_groups(id) ON DELETE CASCADE,
  target_group_id UUID REFERENCES public.identity_groups(id) ON DELETE CASCADE,
  weight INT DEFAULT 1,
  shared_projects UUID[] DEFAULT '{}',
  shared_project_titles TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_group_id, target_group_id)
);

-- RLS for relationship_edges
ALTER TABLE public.relationship_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage relationship edges" ON public.relationship_edges
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 4. Call Sheet Heat Metrics - Heat scores per call sheet
CREATE TABLE public.call_sheet_heat_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_call_sheet_id UUID REFERENCES public.global_call_sheets(id) ON DELETE CASCADE,
  total_responses INT DEFAULT 0,
  paid_count INT DEFAULT 0,
  waiting_count INT DEFAULT 0,
  never_paid_count INT DEFAULT 0,
  unanswered_count INT DEFAULT 0,
  heat_score NUMERIC DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(global_call_sheet_id)
);

-- RLS for call_sheet_heat_metrics
ALTER TABLE public.call_sheet_heat_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage heat metrics" ON public.call_sheet_heat_metrics
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 5. Add identity columns to crew_contacts
ALTER TABLE public.crew_contacts
ADD COLUMN IF NOT EXISTS identity_group_id UUID REFERENCES public.identity_groups(id),
ADD COLUMN IF NOT EXISTS identity_confidence NUMERIC DEFAULT 0.0;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_identity_groups_canonical_name ON public.identity_groups(canonical_name);
CREATE INDEX IF NOT EXISTS idx_network_nodes_identity_group ON public.network_nodes(identity_group_id);
CREATE INDEX IF NOT EXISTS idx_relationship_edges_source ON public.relationship_edges(source_group_id);
CREATE INDEX IF NOT EXISTS idx_relationship_edges_target ON public.relationship_edges(target_group_id);
CREATE INDEX IF NOT EXISTS idx_heat_metrics_call_sheet ON public.call_sheet_heat_metrics(global_call_sheet_id);
CREATE INDEX IF NOT EXISTS idx_crew_contacts_identity_group ON public.crew_contacts(identity_group_id);

-- 7. Function to calculate heat score for a call sheet
CREATE OR REPLACE FUNCTION public.calculate_call_sheet_heat_score(sheet_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  paid_cnt INT := 0;
  waiting_cnt INT := 0;
  never_cnt INT := 0;
  unanswered_cnt INT := 0;
  total_responses INT := 0;
  raw_score NUMERIC;
  heat_score NUMERIC;
BEGIN
  -- Count responses by payment status
  SELECT 
    COUNT(*) FILTER (WHERE payment_status = 'paid'),
    COUNT(*) FILTER (WHERE payment_status = 'waiting'),
    COUNT(*) FILTER (WHERE payment_status = 'never'),
    COUNT(*) FILTER (WHERE payment_status IS NULL OR payment_status = 'unanswered')
  INTO paid_cnt, waiting_cnt, never_cnt, unanswered_cnt
  FROM user_call_sheets
  WHERE global_call_sheet_id = sheet_id;
  
  total_responses := paid_cnt + waiting_cnt + never_cnt;
  
  IF total_responses = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Formula: (waiting × 0.5) + (never × 1.0) - (paid × 0.25)
  raw_score := (waiting_cnt * 0.5) + (never_cnt * 1.0) - (paid_cnt * 0.25);
  heat_score := raw_score / total_responses;
  
  -- Upsert heat metrics
  INSERT INTO call_sheet_heat_metrics (
    global_call_sheet_id, total_responses, paid_count, waiting_count, 
    never_paid_count, unanswered_count, heat_score, updated_at
  ) VALUES (
    sheet_id, total_responses, paid_cnt, waiting_cnt, 
    never_cnt, unanswered_cnt, heat_score, NOW()
  )
  ON CONFLICT (global_call_sheet_id) DO UPDATE SET
    total_responses = EXCLUDED.total_responses,
    paid_count = EXCLUDED.paid_count,
    waiting_count = EXCLUDED.waiting_count,
    never_paid_count = EXCLUDED.never_paid_count,
    unanswered_count = EXCLUDED.unanswered_count,
    heat_score = EXCLUDED.heat_score,
    updated_at = NOW();
  
  RETURN heat_score;
END;
$$;

-- 8. Function to recalculate all heat scores
CREATE OR REPLACE FUNCTION public.recalculate_all_heat_scores()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sheet_rec RECORD;
  count_processed INT := 0;
BEGIN
  FOR sheet_rec IN SELECT id FROM global_call_sheets LOOP
    PERFORM calculate_call_sheet_heat_score(sheet_rec.id);
    count_processed := count_processed + 1;
  END LOOP;
  
  RETURN count_processed;
END;
$$;

-- 9. Function to normalize a name for matching
CREATE OR REPLACE FUNCTION public.normalize_contact_name(raw_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN LOWER(TRIM(REGEXP_REPLACE(raw_name, '\s+', ' ', 'g')));
END;
$$;

-- 10. Function to calculate identity score between two contacts
CREATE OR REPLACE FUNCTION public.calculate_identity_score(
  name1 TEXT, emails1 TEXT[], phones1 TEXT[], roles1 TEXT[],
  name2 TEXT, emails2 TEXT[], phones2 TEXT[], roles2 TEXT[]
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  score NUMERIC := 0;
  email_match BOOLEAN := FALSE;
  phone_match BOOLEAN := FALSE;
  name_similarity NUMERIC;
  role_overlap NUMERIC;
BEGIN
  -- Check exact email match (weight: 0.8)
  IF emails1 IS NOT NULL AND emails2 IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM unnest(emails1) e1, unnest(emails2) e2 
      WHERE LOWER(e1) = LOWER(e2)
    ) INTO email_match;
    IF email_match THEN
      score := score + 0.8;
    END IF;
  END IF;
  
  -- Check exact phone match (weight: 0.6)
  IF phones1 IS NOT NULL AND phones2 IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM unnest(phones1) p1, unnest(phones2) p2 
      WHERE REGEXP_REPLACE(p1, '\D', '', 'g') = REGEXP_REPLACE(p2, '\D', '', 'g')
      AND LENGTH(REGEXP_REPLACE(p1, '\D', '', 'g')) >= 10
    ) INTO phone_match;
    IF phone_match THEN
      score := score + 0.6;
    END IF;
  END IF;
  
  -- Name similarity using Levenshtein distance (weight: 0.3)
  name_similarity := 1.0 - (
    levenshtein(normalize_contact_name(name1), normalize_contact_name(name2))::NUMERIC / 
    GREATEST(LENGTH(name1), LENGTH(name2), 1)
  );
  IF name_similarity > 0.8 THEN
    score := score + (name_similarity * 0.3);
  END IF;
  
  -- Role overlap (weight: 0.1)
  IF roles1 IS NOT NULL AND roles2 IS NOT NULL AND array_length(roles1, 1) > 0 AND array_length(roles2, 1) > 0 THEN
    SELECT COUNT(*)::NUMERIC / GREATEST(array_length(roles1, 1), array_length(roles2, 1))
    INTO role_overlap
    FROM (
      SELECT UNNEST(roles1) INTERSECT SELECT UNNEST(roles2)
    ) x;
    score := score + (COALESCE(role_overlap, 0) * 0.1);
  END IF;
  
  RETURN LEAST(score, 1.0);
END;
$$;

-- 11. Trigger to update heat scores when payment status changes
CREATE OR REPLACE FUNCTION public.update_heat_score_on_payment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.global_call_sheet_id IS NOT NULL THEN
    PERFORM calculate_call_sheet_heat_score(NEW.global_call_sheet_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_heat_score ON user_call_sheets;
CREATE TRIGGER trg_update_heat_score
  AFTER INSERT OR UPDATE OF payment_status ON user_call_sheets
  FOR EACH ROW
  EXECUTE FUNCTION update_heat_score_on_payment_change();