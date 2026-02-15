

## Fix: Add Missing `production_company` to ParseResult Returns

### Problem
The `ParseResult` interface (line 191) requires `production_company: string | null`, but two return statements (lines 1145 and 1165) omit it, causing build errors.

### Fix
Add `production_company: parsed.production_company || null,` to both return objects in `supabase/functions/parse-call-sheet/index.ts`:

**Return 1 (line 1145-1151)** -- after the tool_call parse:
```typescript
return {
  contacts: parsed.contacts || [],
  project_title: parsed.project_title || null,
  parsed_date: parsed.parsed_date || null,
  unassigned_emails: parsed.unassigned_emails || [],
  unassigned_phones: parsed.unassigned_phones || [],
  production_company: parsed.production_company || null,
};
```

**Return 2 (line 1165-1171)** -- content fallback parse:
```typescript
return {
  contacts: parsed.contacts || [],
  project_title: parsed.project_title || null,
  parsed_date: parsed.parsed_date || null,
  unassigned_emails: parsed.unassigned_emails || [],
  unassigned_phones: parsed.unassigned_phones || [],
  production_company: parsed.production_company || null,
};
```

### Scope
- 1 file: `supabase/functions/parse-call-sheet/index.ts`
- 2 lines added (one per return block)
- No behavior change -- just passes through what the AI already returns

### Verification
- Build passes with no errors
- Edge function deploys successfully
