

# Plan: Extend YouTube Sync to Include Project Videos

## Problem Summary
The `sync-youtube-views` edge function only processes videos linked via `global_call_sheets.youtube_url`. When videos are added through the project folder's "+ Add Video" button (stored in `project_videos`), they get placeholder records in `youtube_videos` but are never synced to get their actual view counts.

**Database Evidence:**
```text
project_videos entries:
- VxG7ZkRYPu4 → view_count: 0 (not synced)
- MMP5GqVpQtE → view_count: 0 (not synced)
- 5OoFRMobYzs → view_count: 0 (not synced)
```

## Solution: Extend sync-youtube-views Edge Function

Update the sync function to process videos from TWO sources:
1. **Legacy path**: `global_call_sheets.youtube_url` (existing behavior)
2. **New path**: `project_videos.youtube_url` (new behavior)

## Technical Changes

### File to Modify
`supabase/functions/sync-youtube-views/index.ts`

### Implementation

**Step 1: Fetch videos from project_videos table**

Add a second query to fetch YouTube URLs from the `project_videos` table:

```typescript
// Existing: Get videos from call sheets
const { data: sheets } = await adminClient
  .from("global_call_sheets")
  .select("id, youtube_url, youtube_video_id")
  .not("youtube_url", "is", null);

// NEW: Also get videos from project_videos
const { data: projectVideos } = await adminClient
  .from("project_videos")
  .select("id, youtube_url, video_id, youtube_videos(id, video_id)")
  .not("youtube_url", "is", null);
```

**Step 2: Merge video IDs from both sources**

Create a unified map of video IDs to sync, tracking which table needs updating:

```typescript
// Track which records need updating after sync
interface SyncTarget {
  globalSheetIds: string[];      // global_call_sheets to update
  projectVideoIds: string[];     // project_videos (youtube_videos) to update
  youtubeVideoRecordId?: string; // existing youtube_videos.id if any
}

const videoTargets = new Map<string, SyncTarget>();

// Add call sheet sources
for (const sheet of sheets || []) {
  const videoId = extractVideoId(sheet.youtube_url);
  if (videoId) {
    const target = videoTargets.get(videoId) || { globalSheetIds: [], projectVideoIds: [] };
    target.globalSheetIds.push(sheet.id);
    videoTargets.set(videoId, target);
  }
}

// Add project video sources
for (const pv of projectVideos || []) {
  const videoId = extractVideoId(pv.youtube_url);
  if (videoId && pv.video_id) {
    const target = videoTargets.get(videoId) || { globalSheetIds: [], projectVideoIds: [] };
    target.projectVideoIds.push(pv.video_id); // This is the youtube_videos.id
    target.youtubeVideoRecordId = pv.video_id;
    videoTargets.set(videoId, target);
  }
}
```

**Step 3: Update youtube_videos records for project videos**

After fetching metadata from YouTube API, ensure we also update the `youtube_videos` records that were created as placeholders:

```typescript
// Update youtube_videos record (handles both new and existing)
// The existing code already does this - just ensure project_videos are included

// After upserting to youtube_videos, update any linked project video records
const target = videoTargets.get(videoId);
if (target?.projectVideoIds.length) {
  // The video_id in project_videos points to youtube_videos.id
  // The update to youtube_videos already handles this
}
```

## Data Flow After Fix

```text
┌─────────────────────────┐          ┌─────────────────────────┐
│ global_call_sheets      │          │ project_videos          │
│ (youtube_url column)    │          │ (youtube_url column)    │
└───────────┬─────────────┘          └───────────┬─────────────┘
            │                                    │
            └──────────┬─────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ sync-youtube-  │
              │ views function │
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │ youtube_videos │  ← view_count, title, etc. updated
              └────────────────┘
                      │
              ┌───────┴───────┐
              ▼               ▼
     global_call_sheets    project_videos
     (youtube_view_count)  (via youtube_videos FK)
```

## Summary

| What | Before | After |
|------|--------|-------|
| Call sheet "Add YouTube" button | Synced | Synced |
| Project folder "+ Add Video" button | NOT synced | Synced |
| View count on folder cover | Always 0 | Real count |
| View count inside folder modal | Always 0 | Real count |

This is a single-file change to the edge function that ensures all YouTube videos are synced regardless of how they were added to the system.

