

# Fix Build Errors in Leaderboard.tsx

## Problem

There are JSX structure errors — mismatched opening/closing tags causing the build to fail.

## Root Causes

1. **Line 469**: Extra `</Card>` closing tag. The Alert Banner card opens at line 456 and correctly closes at line 468. Line 469 is a stray extra `</Card>` with no matching opener.

2. **Line 636**: `)}` closes a conditional block for the PSCS Formula section, but there's no matching `{showScoringModel && (` or similar conditional opener before the `<Card>` at line 499. The `)}` is dangling.

3. **Lines 1172-1173**: `</>` and `)}` close a fragment and conditional block, but the matching openers are broken due to the cascading errors above.

## Fix

1. **Remove line 469** — delete the stray `</Card>`.
2. **Line 636**: Either remove the stray `)}` if no conditional is intended around the PSCS card, or add the matching conditional opener (e.g., `{showScoringModel && (`) before line 499. I need to check if a `showScoringModel` state or similar existed before the previous edit broke things.
3. **Lines 1172-1173**: Verify the fragment/conditional structure aligns with the rest of the component once fixes 1 and 2 are applied. These likely resolve themselves once the above are fixed.

## Scope
- Single file edit: `src/pages/Leaderboard.tsx`
- No logic, layout, or style changes — purely fixing broken JSX tag nesting

