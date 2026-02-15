

## Fix: Add Missing `cn` Import in CallSheetCard.tsx

### Problem
`CallSheetCard.tsx` line 140 uses `cn()` for conditional class names on the paid/unpaid label, but the `cn` utility is not imported.

### Fix
Add the `cn` import from `@/lib/utils` to the existing import block at the top of `src/components/callsheets/CallSheetCard.tsx`:

```typescript
import { cn } from "@/lib/utils";
```

### Scope
- **1 file touched**: `src/components/callsheets/CallSheetCard.tsx`
- **1 line added**: the import statement
- **No other changes**

### What Will NOT Change
- No layout, CSS, or behavioral changes
- No other files modified
- Toggle logic, toast logic, cooldown logic all unchanged

### Verification
- Build passes with no errors
- Card view still renders the green "Yes" / red "No" label next to the toggle

