

# Plan: Add Project-Level Videos to Portfolio Page

## Problem Summary

The YouTube Portfolio page (`/crew-contacts/:contactId/youtube`) currently only finds videos via the **legacy path**:
- `contact_call_sheets` → `global_call_sheets.youtube_url`

This misses videos added at the **project folder level** via:
- `contact_call_sheets` → `user_call_sheets` → `project_call_sheets` → `project_videos` → `youtube_videos`

**Evidence:** Ronnie Lee Gotch's portfolio shows "0 projects" despite being linked to the Arin Ray project with 3 videos (~1.8M total views).

## Solution: Dual-Source Video Fetching

Extend `ContactYouTubePortfolio.tsx` to fetch videos from TWO sources:

1. **Project-Level Videos** (NEW): Videos linked via `project_videos` to any project the contact's call sheets belong to
2. **Sheet-Level Videos** (Existing): Videos linked directly via `global_call_sheets.youtube_video_id`

## Database Path for Project Videos

```text
crew_contacts
    ↓ contact_call_sheets (contact_id → call_sheet_id)
global_call_sheets (id = call_sheet_id)
    ↓ user_call_sheets (global_call_sheet_id = id)
        ↓ project_call_sheets (user_call_sheet_id = id)
            ↓ projects (id = project_id)
                ↓ project_videos (project_id = id)
                    ↓ youtube_videos (id = video_id)
```

## Technical Changes

### File to Modify
`src/pages/ContactYouTubePortfolio.tsx`

### Implementation Steps

**Step 1: Fetch contact's linked call sheets** (existing)
```typescript
const { data: links } = await supabase
  .from("contact_call_sheets")
  .select("call_sheet_id")
  .eq("contact_id", contactId);
```

**Step 2: Find which call sheets are in projects** (NEW)
```typescript
// Get user_call_sheets → project links for this contact's sheets
const { data: projectLinks } = await supabase
  .from("user_call_sheets")
  .select(`
    global_call_sheet_id,
    project_call_sheets!inner (
      project_id
    )
  `)
  .in("global_call_sheet_id", callSheetIds);
```

**Step 3: Get project videos** (NEW)
```typescript
// Get all videos for the projects the contact is linked to
const { data: projectVideosData } = await supabase
  .from("project_videos")
  .select(`
    project_id,
    video_id,
    youtube_videos!inner (*)
  `)
  .in("project_id", uniqueProjectIds);
```

**Step 4: Merge with legacy sheet videos** (existing, modified)
```typescript
// Legacy: sheets with direct youtube_video_id
const { data: sheetsData } = await supabase
  .from("global_call_sheets")
  .select("id, youtube_video_id, ...")
  .in("id", callSheetIds)
  .not("youtube_video_id", "is", null);

// Combine both sources, deduplicate by video_id
const allVideoIds = new Set([
  ...projectVideoIds,
  ...sheetVideoIds
]);
```

**Step 5: Fetch credits for project videos** (NEW)
For project videos, credits come from ALL contacts linked to ANY call sheet in that project:

```typescript
// Get all contacts linked to the project's call sheets
const { data: projectContacts } = await supabase
  .from("contact_call_sheets")
  .select(`
    call_sheet_id,
    crew_contacts!inner (id, name, ig_handle, roles)
  `)
  .in("call_sheet_id", projectCallSheetIds);
```

## Deduplication Logic

If the same video appears in both:
- A project folder (`project_videos`)
- A direct sheet link (`global_call_sheets.youtube_video_id`)

We deduplicate by `video_id` and prefer the project-level attribution (richer credits from multiple sheets).

## Expected Results

For "Ronnie Lee Gotch" who appears on "Arin Ray 12:19:21.pdf":

| Before | After |
|--------|-------|
| 0 videos | 3 videos |
| 0 views | 1,824,794 views |
| "No YouTube Projects Yet" message | Video grid with thumbnails |

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Video in both project & sheet | Deduplicated, project credits used |
| Contact on multiple sheets in same project | Same project videos shown once |
| Project has no videos | No videos from that project |
| Sheet not in any project | Uses legacy sheet-level video |

## Summary

| What Changes | Before | After |
|--------------|--------|-------|
| Video sources | Sheet-level only | Project + Sheet level |
| Project folder videos | NOT shown | Shown in portfolio |
| Arin Ray crew portfolio | Empty | 3 videos, 1.8M views |
| Credits on project videos | N/A | All project crew listed |

