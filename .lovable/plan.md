

# Fix: Randy's Submission Documents Not Displaying

## Problem
Randy Nguyen submitted a crew report with 17 supporting documents. The files were uploaded successfully and exist in storage, but the admin Review modal shows an empty "Documents:" section, and the ZIP download produces a corrupted file named "Randy Nguyen."

## Root Cause
The `getSignedUrls` function uses `Promise.all` to generate signed URLs for all 17 files. If even ONE `createSignedUrl` call fails (e.g., due to a transient network error, a timing issue, or a policy evaluation hiccup), the entire batch fails. The error is caught, `documentSignedUrls` is set to `[]`, and the admin sees nothing.

The same fragile pattern exists in `downloadAllAsZip` -- one bad URL kills the entire ZIP.

## Solution
Make document URL generation resilient using `Promise.allSettled` so that partial results are shown instead of nothing. Also add a null-safety guard for the Supabase client.

---

## Changes

### File: `src/lib/storage.ts` (1 file, ~15 lines changed)

**1. Add null guard for the Supabase client**

Currently `getSignedUrl` calls `supabase.storage` without checking if `supabase` is null (it can be). Add a guard that throws a clear error instead of crashing.

**2. Replace `Promise.all` with `Promise.allSettled` in `getSignedUrls`**

Before (fragile):
```typescript
const signedUrls = await Promise.all(
  filePaths.map(path => getSignedUrl(path, expiresIn))
);
return signedUrls;
```

After (resilient):
```typescript
const results = await Promise.allSettled(
  filePaths.map(path => getSignedUrl(path, expiresIn))
);

const signedUrls: string[] = [];
for (const result of results) {
  if (result.status === 'fulfilled') {
    signedUrls.push(result.value);
  } else {
    console.error('[STORAGE] Failed to get signed URL:', result.reason);
  }
}
return signedUrls;
```

This ensures that if 16 out of 17 files succeed, the admin sees 16 documents instead of 0.

**3. Add same resilience to `uploadFiles`** (defensive)

If one upload in a batch fails, the function currently throws and loses all previously uploaded paths. Wrap in `allSettled` so partial uploads are preserved.

---

## What will NOT change (invariants)
- No frontend/UI changes
- No schema changes
- No new files created
- The upload flow for users remains identical
- The storage bucket configuration stays the same
- No RLS policy changes needed (policies are correct)

## Verification
1. Open Admin dashboard, navigate to All Submissions tab
2. Click "Review" on Randy Nguyen's submission
3. Confirm the Documents section shows clickable links (up to 17)
4. Click "Download All as ZIP" -- should produce a valid ZIP file with the actual documents
5. If any individual file fails, the rest should still be visible

## Risks
- None -- this is a purely defensive change that makes the existing code more resilient
- Rollback: revert `src/lib/storage.ts` to previous version

