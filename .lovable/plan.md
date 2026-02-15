

## Move Green Checkmark to End of Disclaimer and Confirm Tropicana Status

### 1. Move checkmark icon (CallSheetManager.tsx, 1 line change)

Current (line 47-50):
```
<p className="text-sm text-green-600 flex items-center gap-1.5 mt-2">
  <Check className="h-4 w-4 shrink-0" />
  Relax. We safeguard crew member and vendor privacy, always. Your personal information is NEVER made public.
</p>
```

Updated -- move the `<Check>` icon after the text:
```
<p className="text-sm text-green-600 flex items-center gap-1.5 mt-2">
  Relax. We safeguard crew member and vendor privacy, always. Your personal information is NEVER made public.
  <Check className="h-4 w-4 shrink-0" />
</p>
```

### 2. Tropicana call sheet -- still exists

The Tropicana record (`2a155735`, status `complete`) is still in the `global_call_sheets` table. If you want it deleted, let me know and I can run a SQL delete in the next step. That would be a separate action since it is a data operation, not a code change.

### What will NOT change
- No other files touched
- No schema changes
- No layout or styling changes (just icon position swap within the same flex row)

### Verification
- Green checkmark appears at the end of the disclaimer text instead of the beginning
- No build errors
