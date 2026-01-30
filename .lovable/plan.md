

# Plan: Remove Beta Access Section from Profile Page

## Problem
The "Beta Access Unlocked" badge and "Can you keep a secret?" button are still showing for non-admin users on the Profile page, even though the beta program has ended.

## Solution
Remove the entire beta access section from the Profile page since these features are now accessed through the dedicated portal.

---

## Changes

### File: `src/pages/Profile.tsx`

**Remove lines ~219-238** - The entire beta access section:

```tsx
{/* Beta Access Section - ONLY for non-admins, BELOW Refresh Status */}
{!isAdmin && (
  <>
    <Separator />
    {!betaAccess ? (
      <Button 
        variant="outline" 
        className="w-full"
        onClick={() => navigate('/beta-unlock')}
      >
        Can you keep a secret? 👀
      </Button>
    ) : (
      <div className="flex items-center gap-2">
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Beta Access Unlocked
        </Badge>
      </div>
    )}
  </>
)}
```

---

## Technical Details

| Aspect | Details |
|--------|---------|
| Files modified | 1 (`src/pages/Profile.tsx`) |
| Lines removed | ~20 |
| Risk | Low - UI removal only |

---

## Result

| User Type | Before | After |
|-----------|--------|-------|
| Admin | No beta section shown | No change |
| Non-Admin with Beta | Shows "Beta Access Unlocked" badge | **Removed** |
| Non-Admin without Beta | Shows "Can you keep a secret?" button | **Removed** |

The Leaderboard Access card will show just the access status and "Refresh Status" button, without any beta-related UI.

