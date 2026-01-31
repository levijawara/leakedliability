
# Plan: Continuous Queue Processor with Per-Sheet Timeouts

## Problem
The current `queue-processor` stops after 55 seconds (edge function limit buffer) and needs manual re-invocation. If a single call sheet parsing hangs, it blocks the whole batch with no graceful recovery.

## Solution
Create an enhanced queue processing system that:
1. Processes sheets one at a time with a **60-second per-sheet timeout**
2. **Automatically continues** by re-invoking itself when more sheets remain
3. Marks timed-out sheets as "error" and moves to the next

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                   continuous-queue-processor                     │
├─────────────────────────────────────────────────────────────────┤
│  1. Fetch next queued sheet (FIFO)                              │
│  2. Mark as "parsing"                                            │
│  3. Call parse-call-sheet with 60s timeout (Promise.race)       │
│  4. On success: mark "parsed"                                    │
│  5. On timeout: mark "error" with "timeout after 60s"           │
│  6. Check if more queued sheets exist                           │
│  7. If yes: self-invoke via supabase.functions.invoke()         │
│  8. Return results                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Changes

### 1. New Edge Function
**File: `supabase/functions/continuous-queue-processor/index.ts`**

Key features:
- **Per-sheet timeout**: Uses `AbortController` and `Promise.race()` with a 60-second limit
- **Serial processing**: Processes one sheet at a time for timeout isolation
- **Self-continuation**: Re-invokes itself if more sheets remain queued
- **Graceful failure**: Timed-out sheets get marked as "error" with clear messaging

```typescript
// Core timeout logic
const SHEET_TIMEOUT_MS = 60000; // 60 seconds per sheet

async function processWithTimeout(sheetId: string): Promise<ParseResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SHEET_TIMEOUT_MS);
  
  try {
    const result = await Promise.race([
      supabase.functions.invoke('parse-call-sheet', { 
        body: { call_sheet_id: sheetId } 
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), SHEET_TIMEOUT_MS)
      )
    ]);
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Self-invocation for continuation
const { data: remainingCount } = await supabase
  .from('global_call_sheets')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'queued');

if (remainingCount > 0) {
  await supabase.functions.invoke('continuous-queue-processor', {});
}
```

### 2. Update ReparseControlPanel
**File: `src/components/callsheets/ReparseControlPanel.tsx`**

Change the "Queue Batch" button to invoke `continuous-queue-processor` instead of `queue-processor`.

```typescript
// Before
await supabase.functions.invoke('queue-processor', {});

// After
await supabase.functions.invoke('continuous-queue-processor', {});
```

---

## Timeout Behavior Matrix

| Scenario | Per-Sheet Time | Result |
|----------|----------------|--------|
| Normal parse | 5-30s | ✅ Success, continue to next |
| Slow parse | 30-60s | ✅ Success, continue to next |
| Stalled parse | >60s | ❌ Mark as error "Timeout after 60s", continue to next |
| AI rate limit | Immediate 429 | ❌ Mark as error, continue to next |

---

## Error Handling

Timed-out sheets will be marked with:
- `status: 'error'`
- `error_message: 'Timeout: exceeded 60s limit. May require manual review or re-parse.'`
- `retry_count` incremented

This allows users to:
1. See which sheets timed out
2. Manually retry them later via the "Retry Failed" button
3. Review if the PDF is problematic (large, complex, or corrupted)

---

## Technical Details

| Aspect | Details |
|--------|---------|
| Files created | 1 (`supabase/functions/continuous-queue-processor/index.ts`) |
| Files modified | 1 (`src/components/callsheets/ReparseControlPanel.tsx`) |
| Lines changed | ~150 new, ~2 modified |
| Risk | Low - new function, minimal changes to existing code |
| Rollback | Delete new edge function, revert ReparseControlPanel |

---

## Verification

After implementation:
1. Queue 5+ call sheets using "Queue Batch" button
2. Observe continuous processing in edge function logs
3. Confirm completion of all queued sheets
4. Test timeout by queuing a problematic/large PDF
5. Verify timed-out sheets show appropriate error message
