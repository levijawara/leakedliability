

# Plan: Dynamic Title & Favicon for Extra Credit Domain

## Problem
When users visit `extracredit.studio`, the browser tab still shows "Leaked Liability" with the "LL" favicon, which is confusing.

## Solution
1. Generate an "EC" favicon matching the existing "LL" style (bold black letters, white background)
2. Add dynamic metadata switching based on hostname

---

## Changes

### 1. Create New Favicon
**File: `public/favicon-ec.png`**

Generate an "EC" favicon using the AI image generation API with the same styling:
- Bold black "EC" letters
- White/transparent background
- Same dimensions as existing favicon

### 2. Dynamic Metadata Switching
**File: `src/App.tsx`**

Extend the existing domain detection `useEffect` to also update document title and favicon:

```typescript
// Domain-based redirect AND metadata for extracredit.studio
useEffect(() => {
  const hostname = window.location.hostname;
  const isExtraCreditDomain = 
    hostname === 'extracredit.studio' || 
    hostname === 'www.extracredit.studio';
  
  // Update title and favicon for Extra Credit domain
  if (isExtraCreditDomain) {
    document.title = 'Extra Credit';
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = '/favicon-ec.png';
    }
  }
  
  // Only redirect if not already in /extra-credit path
  if (isExtraCreditDomain && !location.pathname.startsWith('/extra-credit')) {
    // ... existing redirect logic ...
  }
}, [location.pathname]);
```

---

## Result

| Domain | Tab Title | Favicon |
|--------|-----------|---------|
| `leakedliability.lovable.app` | Leaked Liability | LL |
| `extracredit.studio` | Extra Credit | EC |

---

## Technical Details

| Aspect | Details |
|--------|---------|
| Files created | 1 (`public/favicon-ec.png`) |
| Files modified | 1 (`src/App.tsx`) |
| Lines changed | ~8 |
| Risk | Low - additive metadata change |

