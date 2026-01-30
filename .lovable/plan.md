

# Plan: Remove AI Chat Assistant from Parse Review

## Overview

Remove the "LL Chat" / "Need help?" AI assistant from the Parse Review page entirely. You will add manual tools/buttons to the toolbar as needed.

## What Gets Removed

| Component | Location | Purpose |
|-----------|----------|---------|
| `ParseChatAssistant.tsx` | `src/components/callsheets/` | The floating chat bubble UI |
| `parse-chat-assistant` | `supabase/functions/` | Edge function for AI responses |
| Import + JSX | `src/pages/ParseReview.tsx` | Usage of the assistant |

## Files to Delete

| File | Reason |
|------|--------|
| `src/components/callsheets/ParseChatAssistant.tsx` | No longer needed |
| `supabase/functions/parse-chat-assistant/index.ts` | No longer needed |

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/ParseReview.tsx` | Remove import and JSX block for `ParseChatAssistant` |

## Technical Changes

### ParseReview.tsx

Remove import:
```typescript
// DELETE THIS LINE
import { ParseChatAssistant } from "@/components/callsheets/ParseChatAssistant";
```

Remove JSX block (around lines 444-470):
```typescript
// DELETE THIS BLOCK
{/* AI Chat Assistant */}
{contacts.length > 0 && (
  <ParseChatAssistant
    callSheetId={callSheet.id}
    fileName={callSheet.original_file_name}
    parsedContacts={contacts}
    excludedIndices={excludedIndices}
    existingContacts={existingContacts}
    onExclude={handleExclude}
    onInclude={handleInclude}
    onSaveAll={handleSaveAll}
    onTogglePdf={...}
    showPdf={showPdf}
    onFilterView={...}
    activeFilter={activeFilter}
    onJumpToContact={...}
    onNavigateToMatching={...}
  />
)}
```

### Edge Function Cleanup

After deleting the edge function code, deploy the deletion so the function is removed from the backend.

## Result

- No more "Need help?" floating button on Parse Review
- Toolbar remains available for you to add manual tools/buttons
- No changes to any other functionality (Save All, JSON, CSV, Verify Source all stay)

## Risk Assessment

| Risk | Level | Notes |
|------|-------|-------|
| Feature loss | Expected | Intentional removal per request |
| Rollback | Easy | Re-add files from git history if needed |
| Other pages affected | None | Assistant only used on Parse Review |

