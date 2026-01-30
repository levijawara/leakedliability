

# Plan: Add Extra Credit Portal to Sitemap + Admin Navigation in Portal

## Problem
1. The Sitemap page doesn't show the Extra Credit portal routes, making it incomplete
2. Admin users in the Extra Credit portal have no way to navigate back to the main Leaked Liability site or access admin features

## Solution

### Part 1: Add Extra Credit Portal Routes to Sitemap

**File: `src/config/routes.ts`**

Add a new category `portal` and add all Extra Credit routes:

```typescript
// Add 'portal' to the RouteMetadata category type (line 7)
category: 'public' | 'authenticated' | 'leaderboard' | 'admin' | 'system' | 'portal';

// Add portal routes after system routes (after line 75)
// Portal Routes (Extra Credit)
{ path: "/extra-credit", component: "Redirect", name: "Extra Credit Portal", icon: "Sparkles", description: "Portal redirect to call sheets", category: "portal" },
{ path: "/extra-credit/auth", component: "Auth", name: "Portal Auth", icon: "LogIn", description: "Portal authentication", category: "portal" },
{ path: "/extra-credit/call-sheets", component: "CallSheetManager", name: "Portal Call Sheets", icon: "FileSpreadsheet", description: "Call sheet management (portal)", category: "portal" },
{ path: "/extra-credit/call-sheets/:id/review", component: "ParseReview", name: "Portal Parse Review", icon: "FileSearch", description: "Review parsed call sheet (portal)", category: "portal" },
{ path: "/extra-credit/call-sheets/:id/ig-matching", component: "IGMatching", name: "Portal IG Matching", icon: "Instagram", description: "Instagram matching (portal)", category: "portal" },
{ path: "/extra-credit/call-sheets/:id/nova-matching", component: "NOVAMatching", name: "Portal NOVA Matching", icon: "Star", description: "NOVA matching (portal)", category: "portal" },
{ path: "/extra-credit/crew-contacts", component: "CrewContacts", name: "Portal Crew Contacts", icon: "Users", description: "Crew contacts (portal)", category: "portal" },
{ path: "/extra-credit/crew-contacts/:contactId/youtube", component: "ContactYouTubePortfolio", name: "Portal YouTube Portfolio", icon: "Youtube", description: "Contact YouTube portfolio (portal)", category: "portal" },

// Update ROUTE_CATEGORIES (line 78)
export const ROUTE_CATEGORIES = ['public', 'authenticated', 'leaderboard', 'admin', 'system', 'portal'] as const;
```

**File: `src/pages/Sitemap.tsx`**

Add portal category handling:
- Add `portal` to the `RoutesData` interface
- Add portal variant styling (sparkles/purple theme)
- Add portal section in the render

### Part 2: Add Admin Menu Items to Portal Navigation

**File: `src/components/PortalNavigation.tsx`**

Add admin status check and admin menu items:

```typescript
// Add imports
import { Shield, TrendingUp, Map, Home } from "lucide-react";

// Add admin state and check
const [isAdmin, setIsAdmin] = useState(false);

// Add checkAdminStatus function (similar to Navigation.tsx)
const checkAdminStatus = async (userId: string) => { ... };

// Add admin menu items to dropdown (when isAdmin is true):
<DropdownMenuSeparator />
<DropdownMenuItem onClick={() => navigate("/")}>
  <Home className="h-4 w-4 mr-2" />
  Leaked Liability
</DropdownMenuItem>
{isAdmin && (
  <>
    <DropdownMenuItem onClick={() => navigate("/admin")}>
      <Shield className="h-4 w-4 mr-2" />
      Admin Dashboard
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => navigate("/leaderboard-analytics")}>
      <TrendingUp className="h-4 w-4 mr-2" />
      Analytics
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => navigate("/sitemap")}>
      <Map className="h-4 w-4 mr-2" />
      Site Map
    </DropdownMenuItem>
  </>
)}
```

---

## Visual Preview

### Sitemap - New Portal Section
```
┌─────────────────────────────────────────────────────┐
│ ✨ EXTRA CREDIT PORTAL ROUTES       8 routes        │
├─────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│ │ Portal Entry │ │ Portal Auth  │ │ Call Sheets  │  │
│ │    ✨ Portal │ │    ✨ Portal │ │    ✨ Portal │  │
│ └──────────────┘ └──────────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Portal Navigation - Admin Menu
```
┌─────────────────────────┐
│ admin@example.com       │
├─────────────────────────┤
│ 📄 Call Sheets          │
│ 👥 Crew Contacts        │
├─────────────────────────┤
│ 🏠 Leaked Liability     │  ← NEW: Link to main site
│ 🛡️ Admin Dashboard      │  ← NEW: Admin only
│ 📈 Analytics            │  ← NEW: Admin only
│ 🗺️ Site Map             │  ← NEW: Admin only
├─────────────────────────┤
│ 🚪 Sign Out             │
└─────────────────────────┘
```

---

## Technical Details

| Aspect | Details |
|--------|---------|
| Files modified | 3 (`routes.ts`, `Sitemap.tsx`, `PortalNavigation.tsx`) |
| Lines added | ~80 |
| Risk | Low - additive changes only |
| Behavior change | Admin users can now navigate between portal and main site |

