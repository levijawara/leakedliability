

# Plan: Project/Job Folder System for Call Sheets

## Problem Summary
Currently, each call sheet is displayed as an individual card. When you have multi-day shoots (like the 2-day Arin Ray job that produced 3 videos), there's no way to:
1. Group related call sheets together as one "job"
2. Attach multiple YouTube links to a single project
3. Visually see that these call sheets belong together

## User Experience Vision

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CALL SHEET MANAGER - Cards View (4 columns)                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ 📁 FOLDER    │  │ ✓ Complete   │  │ ⚠ Review    │  │ ✓ Complete   │        │
│  │              │  │              │  │              │  │              │        │
│  │ Arin Ray     │  │ Alo Yoga     │  │ Black Coffee │  │ Bobby S      │        │
│  │ Project      │  │ 9:23:21.pdf  │  │ 5:13:21.pdf  │  │ Shmoney.pdf  │        │
│  │              │  │              │  │              │  │              │        │
│  │ ────────────-│  │ Shoot: Sep 22│  │ Shoot: May 12│  │ 🎬 33.9M     │        │
│  │ • 12:19:21   │  │ Added: Jan 4 │  │ Added: Jan 5 │  │              │        │
│  │ • 12:21:21   │  │              │  │              │  │              │        │
│  │              │  │ ▶ Add YouTube│  │ ▶ Add YouTube│  │              │        │
│  │ 🎬 3 videos  │  │              │  │              │  │              │        │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

                          ▼ Click on "Arin Ray Project" folder ▼

┌─────────────────────────────────────────────────────────────────────────────────┐
│  📁 ARIN RAY PROJECT                                                   [X]      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  PROJECT VIDEOS (3)                                                             │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ 🎬 The Mood    │ 🎬 Gold        │ 🎬 Good Evening │   [ + Add Video ]   │  │
│  │ 1.2M views  ✕  │ 800K views  ✕  │ 500K views   ✕  │                     │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  CALL SHEETS (2)                              ← 2-3 column grid                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                       │
│  │ ✓ Complete       22     │  │ ✓ Complete       9      │                       │
│  │                         │  │                         │                       │
│  │ Arin Ray 12:19:21.pdf   │  │ Arin Ray 12:21:21.pdf   │                       │
│  │                         │  │                         │                       │
│  │ Shoot: Dec 18, 2021     │  │ Shoot: Dec 20, 2021     │                       │
│  │ Added: Jan 5, 2026      │  │ Added: Jan 5, 2026      │                       │
│  │                         │  │                         │                       │
│  │ [👁] [📄] [📝] [🗑]     │  │ [👁] [📄] [📝] [🗑]     │                       │
│  └─────────────────────────┘  └─────────────────────────┘                       │
│                                                                                 │
│                           [ Ungroup Project ]                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### New Database Tables

**1. `projects` Table (User-scoped job/folder groupings)**
```sql
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**2. `project_call_sheets` Junction Table (Links sheets to project)**
```sql
CREATE TABLE public.project_call_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_call_sheet_id UUID NOT NULL REFERENCES user_call_sheets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_call_sheet_id)
);
```

**3. `project_videos` Junction Table (Multiple videos per project)**
```sql
CREATE TABLE public.project_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES youtube_videos(id) ON DELETE CASCADE,
  youtube_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, video_id)
);
```

### Entity Relationship

```text
┌─────────────────┐      ┌─────────────────────┐      ┌─────────────────┐
│ projects        │◄─────│ project_call_sheets │─────►│ user_call_sheets│
│ (user's folder) │      └─────────────────────┘      │ (user's links)  │
└────────┬────────┘                                   └─────────────────┘
         │                                                      │
         │           ┌─────────────────────┐                    │
         └───────────│ project_videos      │                    │
                     └─────────┬───────────┘                    │
                               │                                │
                               ▼                                │
                     ┌─────────────────┐      ┌─────────────────┤
                     │ youtube_videos  │◄─────│global_call_sheets│
                     │ (canonical)     │      │ (legacy 1:1 link)│
                     └─────────────────┘      └──────────────────┘
```

### RLS Policies
- `projects`: Users can CRUD their own projects (user_id = auth.uid())
- `project_call_sheets`: Users can CRUD links where project belongs to them
- `project_videos`: Same ownership model

---

## Implementation Steps

### Phase 1: Database Schema (1 Migration)

Create all three tables with RLS policies:
- `projects` - User-scoped folder/job groupings
- `project_call_sheets` - Links call sheets to projects
- `project_videos` - Links multiple YouTube videos to projects

### Phase 2: New UI Components

**1. `ProjectFolderCard.tsx`**
- Same size as `CallSheetCard`
- Shows folder icon and project name
- Lists contained call sheet filenames (truncated)
- Shows video count badge (e.g., "3 videos")
- Click opens `ProjectDetailModal`

**2. `ProjectDetailModal.tsx`**
- Full-screen modal with sections:
  - **Header**: Project name (editable), close button
  - **Videos Section**: Chips/badges for each linked video, "+ Add Video" button
  - **Call Sheets Section**: 2-3 column grid of regular `CallSheetCard` components
  - **Footer**: "Ungroup Project" button

**3. `ProjectVideoLinker.tsx`**
- URL input for adding YouTube videos
- Shows linked videos as chips with remove button
- Handles video lookup/creation in `youtube_videos` table

**4. `CreateProjectModal.tsx`**
- Triggered from bulk actions bar when multiple call sheets selected
- Input for project name
- Shows selected call sheets that will be grouped

### Phase 3: Modify Existing Components

**1. `CallSheetList.tsx`**
- Fetch projects for user alongside call sheets
- Identify which call sheets are grouped
- Render `ProjectFolderCard` for grouped sheets
- Render `CallSheetCard` for ungrouped sheets
- Remove grouped sheets from the flat list (they appear inside folders)

**2. `CallSheetBulkActionsBar.tsx`**
- Add "Create Project" button (appears when 2+ selected)
- Opens `CreateProjectModal`

### Phase 4: Portfolio Integration

Update `ContactYouTubePortfolio.tsx` to:
- Query videos from both legacy `youtube_video_id` FK and new `project_videos` junction
- Aggregate view counts correctly across project videos
- Deduplicate videos that appear in multiple contexts

---

## Technical Details

### Files to Create
1. `supabase/migrations/XXXX_create_projects_tables.sql`
2. `src/components/callsheets/ProjectFolderCard.tsx`
3. `src/components/callsheets/ProjectDetailModal.tsx`
4. `src/components/callsheets/ProjectVideoLinker.tsx`
5. `src/components/callsheets/CreateProjectModal.tsx`

### Files to Modify
1. `src/components/callsheets/CallSheetList.tsx` - Fetch and render projects
2. `src/components/callsheets/CallSheetBulkActionsBar.tsx` - Add "Create Project" action
3. `src/pages/ContactYouTubePortfolio.tsx` - Query new junction table

### Key Queries

**Fetch user's projects with sheet/video counts:**
```sql
SELECT 
  p.*,
  COUNT(DISTINCT pcs.user_call_sheet_id) as sheet_count,
  COUNT(DISTINCT pv.video_id) as video_count,
  SUM(yv.view_count) as total_views
FROM projects p
LEFT JOIN project_call_sheets pcs ON pcs.project_id = p.id
LEFT JOIN project_videos pv ON pv.project_id = p.id
LEFT JOIN youtube_videos yv ON yv.id = pv.video_id
WHERE p.user_id = :userId
GROUP BY p.id;
```

**Get ungrouped call sheets (not in any project):**
```sql
SELECT ucs.* 
FROM user_call_sheets ucs
WHERE ucs.user_id = :userId
AND NOT EXISTS (
  SELECT 1 FROM project_call_sheets pcs 
  WHERE pcs.user_call_sheet_id = ucs.id
);
```

---

## UI/UX Details

### Folder Card Visual
- Same dimensions as regular call sheet card
- Folder icon (📁) instead of file icon
- Project name as title
- List of call sheet filenames (show 2-3, then "+X more")
- Video count badge at bottom
- Aggregate view count if videos linked

### Modal Layout
- Width: max-w-4xl (responsive down to 2 columns)
- Height: max-h-[85vh] with scroll
- Sections clearly separated with borders/spacing
- Call sheet cards inside use 2-column grid on desktop, 1 on mobile

### Interaction Patterns
- Create project: Select 2+ sheets → "Create Project" in bulk bar
- Add to project: Drag-and-drop (future) or select + button
- Ungroup: Button in modal returns sheets to flat list
- Add videos: "+" button in videos section opens URL input

---

## Summary

| Component | Purpose |
|-----------|---------|
| `projects` table | User's job/folder groupings |
| `project_call_sheets` | Links call sheets to projects |
| `project_videos` | Links multiple YouTube videos to projects |
| `ProjectFolderCard` | Compact folder view in grid |
| `ProjectDetailModal` | Full modal with sheets + videos |
| `CreateProjectModal` | Bulk action to create project |

This approach:
- Preserves individual call sheet attribution for contacts
- Allows grouping for organizational purposes
- Supports multiple videos per project
- Keeps the existing 1:1 legacy link for backward compatibility
- Uses same card dimensions for visual consistency

