

## Admin.tsx Dead Code Cleanup + Remove Parse Queue

Remove all orphaned state, functions, data fetches, UI blocks, and imports from `src/pages/Admin.tsx` that are no longer referenced after Cursor's feature removals. Also remove the Call Sheet Parse Queue section as requested.

### File: `src/pages/Admin.tsx` (1 file changed)

### Removals

**Dead State Variables (lines 96-97, 115-135)**
- `backfillContactsLoading` -- backfill unsaved contacts removed
- `identityClaims`, `processingClaimId` -- Identity Claims tab removed
- `callSheetRateLimitEnabled`, `callSheetRateLimitPerHour`, `callSheetConfigId` -- rate limit UI removed
- `processingQueue`, `queuedCallSheetsCount` -- parse queue being removed
- `syncingYouTube` -- YouTube sync removed
- `igMasterImporting`, `igMasterStats`, `igMasterFile`, `igIdentities`, `igIdentitiesLoading`, `igSearchTerm` -- IG Master removed
- `novaMasterImporting`, `novaMasterStats`, `novaMasterFile` -- NOVA Master removed

**Dead Data Fetches in `loadAdminData` (lines 259-276, 430-436)**
- `call_sheet_config` fetch (rate limit config)
- `global_call_sheets` queued count fetch
- Identity claims fetch from `producers` table

**Dead Functions**
- `handleBackfillUnsavedContacts` (lines 532-558)
- `toggleCallSheetRateLimit` (lines 1279-1312)
- `updateCallSheetRateLimit` (lines 1314-1336)
- `triggerQueueProcessor` (lines 1338-1367)
- `triggerYouTubeSync` (lines 1369-1404)
- `handleApproveIdentityClaim` (lines 1623-1647)
- `handleRejectIdentityClaim` (lines 1649-1682)

**Dead UI: Call Sheet Parse Queue (lines 1869-1895)**
- The entire parse queue block in the right column

**Dead Imports (line 10, 47)**
- Unused icons: `Shield`, `Upload`, `Youtube`, `RefreshCw`, `Users`
- Unused component: `BetaAccessPanel`

### What Will NOT Change
- No schema changes, no new files, no other files touched
- Producer Notification Emails section stays (just restored by Cursor)
- ManualEmailSender + ProducerNotificationSelector imports stay (actively used)
- Maintenance Mode toggle, Global Free Leaderboard Access, Database Export -- all stay
- All tabs (Payments Due, Paid, Users, Broadcast, All Submissions, Suggestions, Reversal Other) untouched
- No layout or CSS changes beyond removing the parse queue block

### Verification
1. Build passes with no new errors
2. `/admin` page renders identically minus the parse queue section
3. Network tab shows fewer queries on load (no more call_sheet_config or queued count fetches)
4. All remaining tabs and actions still work

### Risks
- None. Pure dead code removal. All removed code has no references in the current render tree.
- Fully reversible by reverting `Admin.tsx`.

