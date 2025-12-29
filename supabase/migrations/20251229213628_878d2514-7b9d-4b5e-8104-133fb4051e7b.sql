-- Phase 1: Fix global_call_sheets RLS and create secure lookup function
-- Phase 2: Add storage policies for master/ path

-- ============================================================
-- PHASE 1A: Fix the broken SELECT policy on global_call_sheets
-- ============================================================

-- Drop the broken policy (compares column to itself)
DROP POLICY IF EXISTS "Users can view linked global call sheets" ON public.global_call_sheets;

-- Create correct policy - users can only view global sheets they're linked to (or admins)
CREATE POLICY "Users can view linked global call sheets"
ON public.global_call_sheets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_call_sheets ucs
    WHERE ucs.global_call_sheet_id = global_call_sheets.id
      AND ucs.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================================
-- PHASE 1B: Add INSERT policy for authenticated users
-- ============================================================

-- Allow authenticated users to create new global call sheet entries
CREATE POLICY "Authenticated users can create global call sheets"
ON public.global_call_sheets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- PHASE 1C: Create SECURITY DEFINER lookup function
-- ============================================================

-- This allows authenticated users to check if a hash exists WITHOUT
-- exposing parsed_contacts (PII). Returns only {id, status}.
CREATE OR REPLACE FUNCTION public.lookup_global_call_sheet_by_hash(_content_hash text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN auth.uid() IS NULL THEN NULL
      ELSE (
        SELECT jsonb_build_object('id', g.id, 'status', g.status)
        FROM public.global_call_sheets g
        WHERE g.content_hash = _content_hash
        LIMIT 1
      )
    END;
$$;

-- Restrict access to authenticated users only
REVOKE ALL ON FUNCTION public.lookup_global_call_sheet_by_hash(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_global_call_sheet_by_hash(text) TO authenticated;

-- ============================================================
-- PHASE 2A: Storage policy - allow upload to master/ path
-- ============================================================

-- Allow authenticated users to upload to the shared master path
CREATE POLICY "Authenticated users can upload master call sheets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'call_sheets'
  AND name LIKE 'master/%'
  AND auth.uid() IS NOT NULL
);

-- ============================================================
-- PHASE 2B: Storage policy - allow linked users to read master files
-- ============================================================

-- Allow users to download master PDFs if they have a link
CREATE POLICY "Users can read linked master call sheets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'call_sheets'
  AND name LIKE 'master/%'
  AND EXISTS (
    SELECT 1
    FROM public.global_call_sheets g
    JOIN public.user_call_sheets u
      ON u.global_call_sheet_id = g.id
    WHERE u.user_id = auth.uid()
      AND g.master_file_path = storage.objects.name
  )
);