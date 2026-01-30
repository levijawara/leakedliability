# Plan: Add Extra Credit Portal to Sitemap + Admin Navigation in Portal

## ✅ COMPLETED

### Summary
Added Extra Credit portal routes to the Sitemap page and enhanced the Portal Navigation with admin menu items.

### Changes Made

**1. `src/config/routes.ts`**
- Added `portal` to the category type
- Added 8 new portal routes for Extra Credit
- Updated `ROUTE_CATEGORIES` to include `portal`

**2. `src/pages/Sitemap.tsx`**
- Added `system` and `portal` to the `RoutesData` interface
- Added filtering for system and portal routes
- Added violet/sparkle styling for portal routes
- Added portal section rendering in both list and gallery views

**3. `src/components/PortalNavigation.tsx`**
- Added admin status check using `has_role` RPC
- Added "Leaked Liability" link (always visible when logged in)
- Added admin-only links: Admin Dashboard, Analytics, Site Map
- Enhanced dropdown structure with separators

### Result
- Sitemap now shows all platform routes including Extra Credit portal (8 routes)
- Admin users in the portal can navigate back to main site and access admin features
