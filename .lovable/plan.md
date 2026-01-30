
# Plan: Add Domain-Based Redirect for extracredit.studio

## Problem
Now that `extracredit.studio` is connected to this project, visitors to that domain should be automatically redirected to the Extra Credit portal (`/extra-credit/call-sheets`) instead of the main Leaked Liability homepage.

## Solution
Add hostname detection in `AppContent` that redirects visitors from `extracredit.studio` to the portal.

---

## Changes

### File: `src/App.tsx`

**Add a useEffect hook** after line 77 (after `const location = useLocation();`) to detect the domain and redirect:

```typescript
// Domain-based redirect for extracredit.studio
useEffect(() => {
  const hostname = window.location.hostname;
  const isExtraCreditDomain = 
    hostname === 'extracredit.studio' || 
    hostname === 'www.extracredit.studio';
  
  // Only redirect if on extracredit.studio AND not already in /extra-credit path
  if (isExtraCreditDomain && !location.pathname.startsWith('/extra-credit')) {
    // Preserve the path for auth/reset-password, map others to portal
    const portalPaths = ['/auth', '/reset-password', '/verify-email'];
    const currentPath = location.pathname;
    
    if (portalPaths.includes(currentPath)) {
      window.location.href = `/extra-credit${currentPath}`;
    } else {
      window.location.href = '/extra-credit/call-sheets';
    }
  }
}, [location.pathname]);
```

---

## Behavior

| Domain | Path | Result |
|--------|------|--------|
| `extracredit.studio` | `/` | Redirect to `/extra-credit/call-sheets` |
| `extracredit.studio` | `/auth` | Redirect to `/extra-credit/auth` |
| `extracredit.studio` | `/extra-credit/...` | No redirect (already in portal) |
| `leakedliability.com` | `/` | Normal homepage (no redirect) |
| `leakedliability.com` | `/extra-credit/...` | Normal portal access |

---

## Technical Details

| Aspect | Details |
|--------|---------|
| Files modified | 1 (`src/App.tsx`) |
| Lines added | ~15 |
| Risk | Low - conditional redirect only |
| Note | Uses `window.location.href` for clean redirect without flash |
