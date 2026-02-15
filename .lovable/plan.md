

## Fix: Add Missing ALEXANDRIA Button to Admin Dashboard

### Problem
The ALEXANDRIA button code (added via Cursor) is not present in the current `src/pages/Admin.tsx` file. The diff showed it being inserted after the Global Free Leaderboard Access toggle (after line 1608), but the file currently jumps straight from the toggle's closing `</div>` to the Database Export section.

### What changes
**1 file modified**: `src/pages/Admin.tsx`

### Details
Re-add the ALEXANDRIA button in the right column of the admin dashboard, immediately after the Global Free Leaderboard Access toggle (after line 1608, before the closing `</div>` on line 1610):

```tsx
<Button
  onClick={() => navigate("/admin/call-sheet-reservoir")}
  size="lg"
  className="w-full mt-4 py-6 text-lg font-bold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-amber-50 shadow-lg hover:shadow-xl transition-all duration-200"
>
  <BookOpen className="h-6 w-6 mr-2" />
  ALEXANDRIA
</Button>
```

- `BookOpen` icon is already imported (confirmed in the diff)
- `navigate` is already available in scope

### What does NOT change
- No layout, CSS, schema, or other file changes
- No new files

### Verification
- Navigate to `/admin`
- The amber/gold ALEXANDRIA button should appear below the Global Free Leaderboard Access toggle in the right column
- Clicking it should route to `/admin/call-sheet-reservoir`

