
# Plan: Attribute Total Project Views to Crew Members

## Problem Summary
Currently, `fetchYouTubeViewCounts` in `CrewContacts.tsx` only sums `youtube_view_count` from `global_call_sheets`. This misses views from videos added at the **project folder level** via `project_videos`.

The user wants: **If you appear on ANY call sheet in a project, you get credit for ALL the project's video views.**

## Database Relationships
```text
crew_contacts
    ↓ contact_call_sheets
global_call_sheets ←→ user_call_sheets
                          ↓ project_call_sheets
                       projects
                          ↓ project_videos  
                       youtube_videos (view_count)
```

## Solution: Dual-Source View Aggregation

Rewrite `fetchYouTubeViewCounts` to calculate views from TWO sources:

1. **Project-Level Views**: If a contact's call sheet is part of a project folder, sum ALL video views linked to that project (deduplicated across sheets)
2. **Sheet-Level Views** (Legacy): For call sheets NOT in a project, use the existing `global_call_sheets.youtube_view_count`

### Deduplication Logic
If a contact appears on 2 sheets in the same project, they should NOT get double credit for the project's videos. We deduplicate by:
- Finding **unique projects** a contact is linked to
- Summing **unique video view counts** per project

## Technical Approach

### File to Modify
`src/pages/CrewContacts.tsx` - `fetchYouTubeViewCounts` function

### New Query Strategy

**Step 1: Fetch project-level video views**
```typescript
// Get contacts linked to projects and their project's video views
const { data: projectViewData } = await supabase
  .from('contact_call_sheets')
  .select(`
    contact_id,
    user_call_sheets!inner (
      project_call_sheets!inner (
        project_id,
        project_videos!inner (
          youtube_videos!inner (
            id,
            view_count
          )
        )
      )
    )
  `)
```

**Step 2: Aggregate project views (deduplicate videos)**
```typescript
// Build: contact_id -> Set of youtube_videos.id -> sum unique view counts
const projectViewsByContact = new Map<string, Map<string, number>>();

projectViewData.forEach(row => {
  const contactId = row.contact_id;
  const videoId = row.youtube_videos.id;
  const viewCount = row.youtube_videos.view_count;
  
  if (!projectViewsByContact.has(contactId)) {
    projectViewsByContact.set(contactId, new Map());
  }
  // Map deduplicates by video ID automatically
  projectViewsByContact.get(contactId).set(videoId, viewCount);
});
```

**Step 3: Add legacy sheet-level views (non-project sheets)**
Keep existing logic for sheets with `youtube_view_count` that aren't part of a project.

**Step 4: Combine both sources**
```typescript
const viewTotals: Record<string, number> = {};

// Add project views (deduplicated)
projectViewsByContact.forEach((videoMap, contactId) => {
  const projectTotal = Array.from(videoMap.values()).reduce((a, b) => a + b, 0);
  viewTotals[contactId] = (viewTotals[contactId] || 0) + projectTotal;
});

// Add sheet-level views (non-project only)
sheetViewData.forEach(row => {
  if (!contactsWithProjects.has(row.contact_id)) {
    viewTotals[row.contact_id] = (viewTotals[row.contact_id] || 0) + row.youtube_view_count;
  }
});
```

## Supabase Query Limitations

The nested join path (`contact_call_sheets` → `user_call_sheets` → `project_call_sheets` → `project_videos` → `youtube_videos`) may be too deep for a single Supabase JS query. If so, we'll use **two separate queries**:

1. Query 1: Get contact → project links
2. Query 2: Get project → video view counts  
3. Client-side join and aggregate

## Expected Results

For "Levi Jawara" who appears on 2 Arin Ray sheets + 4 other sheets:
- Arin Ray project: 3 videos = 1,824,794 views (counted ONCE, not twice)
- Other sheets: Bobby Shmurda (33M), MGK (6M), etc.
- **Total: ~43M views** (deduplicated correctly)

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Contact on 2 sheets in same project | Project views counted once (deduplicated) |
| Contact on sheet NOT in any project | Uses sheet-level `youtube_view_count` |
| Sheet in project but project has no videos | No views from that project |
| Video linked to sheet AND project | Project-level takes precedence |

## Summary

| What Changes | Before | After |
|--------------|--------|-------|
| View source | Sheet-level only | Project + Sheet level |
| Project videos | Not counted | Counted and attributed |
| Deduplication | N/A | By unique video ID per project |
| Multiple sheets same project | N/A | Counted once per project |
