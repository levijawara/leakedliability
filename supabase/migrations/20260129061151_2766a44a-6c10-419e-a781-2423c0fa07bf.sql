-- Phase 1: Project/Job Folder System for Call Sheets
-- Creates tables for grouping call sheets into projects and linking multiple videos

-- 1. Projects table (user-scoped folder/job groupings)
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Junction table: Links call sheets to projects
CREATE TABLE public.project_call_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_call_sheet_id UUID NOT NULL REFERENCES user_call_sheets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_call_sheet_id)
);

-- 3. Junction table: Links multiple videos to projects
CREATE TABLE public.project_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES youtube_videos(id) ON DELETE CASCADE,
  youtube_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, video_id)
);

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_call_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects table
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all projects"
  ON public.projects FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for project_call_sheets junction table
CREATE POLICY "Users can view their project call sheet links"
  ON public.project_call_sheets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_call_sheets.project_id 
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can create project call sheet links"
  ON public.project_call_sheets FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_call_sheets.project_id 
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their project call sheet links"
  ON public.project_call_sheets FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_call_sheets.project_id 
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all project call sheet links"
  ON public.project_call_sheets FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for project_videos junction table
CREATE POLICY "Users can view their project video links"
  ON public.project_videos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_videos.project_id 
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can create project video links"
  ON public.project_videos FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_videos.project_id 
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their project video links"
  ON public.project_videos FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_videos.project_id 
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all project video links"
  ON public.project_videos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_project_call_sheets_project_id ON public.project_call_sheets(project_id);
CREATE INDEX idx_project_call_sheets_user_call_sheet_id ON public.project_call_sheets(user_call_sheet_id);
CREATE INDEX idx_project_videos_project_id ON public.project_videos(project_id);
CREATE INDEX idx_project_videos_video_id ON public.project_videos(video_id);

-- Trigger for updated_at on projects
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();