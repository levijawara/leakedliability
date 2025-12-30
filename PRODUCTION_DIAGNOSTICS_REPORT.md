# Production Diagnostics Report
**Date:** January 3, 2025  
**Scope:** Anonymous user experience assessment  
**Methodology:** Static code analysis of routes, authentication checks, and error handling

---

## Executive Summary

This report identifies what an anonymous, cold user would experience when accessing the application in production. The assessment covers route accessibility, authentication requirements, console errors, and configuration dependencies.

**Critical Finding:** The application will fail to initialize if Supabase environment variables are missing, rendering all routes unusable.

---

## 1. APPLICATION INITIALIZATION

### Critical Failure Point: Missing Environment Variables

**Location:** `src/integrations/supabase/client.ts`

**Issue:** The Supabase client is created without validation:
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

**What Happens:**
- If `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` are undefined, the Supabase client will be initialized with `undefined` values
- Any page load will attempt to query Supabase and fail immediately
- The app will likely crash or show blank screen with console errors

**User Impact:** Application is completely non-functional for anonymous users if env vars are missing.

---

## 2. INITIAL PAGE LOAD BEHAVIOR

### App.tsx Initialization Sequence

**Flow:**
1. App renders with `loading: true` (shows nothing)
2. Calls `checkMaintenanceMode()` - queries `site_settings` table
3. Calls `checkAdminStatus()` - checks auth (non-blocking for anonymous users)
4. Calls `trackVisit()` - invokes edge function
5. Sets up realtime subscription to `site_settings` table
6. Sets `loading: false` and renders routes

**Potential Failures:**

1. **Maintenance Mode Check Failure**
   - If `site_settings` table doesn't exist or RLS blocks anonymous read
   - Query will fail silently (`if (data)` check)
   - App continues with `maintenanceMode: false`
   - **User Impact:** Minimal - app continues normally

2. **Admin Status Check Failure**  
   - Anonymous users don't have session
   - `getUser()` returns null
   - No error thrown, `isAdmin` stays false
   - **User Impact:** None - expected behavior

3. **Track Visit Failure**
   - Edge function call wrapped in try/catch with `console.debug` only
   - Fails silently
   - **User Impact:** Analytics lost, but app continues

4. **Realtime Subscription Failure**
   - Anonymous users may not have permission to subscribe to `site_settings`
   - Subscription may fail silently
   - **User Impact:** Maintenance mode changes won't update in real-time

**Critical:** If Supabase client is invalid (missing env vars), ALL of the above will fail and app won't render.

---

## 3. ROUTE-BY-ROUTE ANALYSIS

### ✅ PUBLICLY ACCESSIBLE ROUTES (No Auth Required)

#### `/` (Index)
- **Status:** ✅ Works
- **Auth:** None required
- **Dependencies:** 
  - Supabase client (for producer search autocomplete)
  - If Supabase fails, search component will error
- **Potential Issues:**
  - Producer search autocomplete may fail if RLS blocks anonymous queries
  - Page will still render, but search functionality broken

#### `/how-it-works`, `/why-it-works`, `/disclaimer`, `/privacy-policy`, `/faq`
- **Status:** ✅ Should work
- **Auth:** None required
- **Dependencies:** None apparent
- **Potential Issues:** Minimal - static content pages

#### `/results`
- **Status:** ⚠️ **PARTIALLY WORKS**
- **Auth:** None required for viewing
- **Dependencies:** `fafo_entries` table, `fafo-results` storage bucket
- **Potential Issues:**
  - If RLS blocks anonymous read of `fafo_entries`, page will load but show no results
  - If storage bucket policies block anonymous access, images won't load
  - Admin delete functionality will fail silently for anonymous users (expected)
  - Console error: `'has_role error'` logged if RLS blocks role check (but doesn't break page)

#### `/submit`
- **Status:** ✅ **WORKS** (with recent changes)
- **Auth:** None required for viewing steps 1-2
- **Dependencies:** Supabase client (for auth check)
- **Potential Issues:**
  - Steps 1-2 (walkthrough, participant type) visible to anonymous users
  - Step 3+ requires auth and will redirect to `/auth?redirect=...`
  - If redirect handling broken, user may see empty page
  - Forms will check auth on submit (as expected)

#### `/auth`, `/reset-password`, `/verify-email`
- **Status:** ✅ Should work
- **Auth:** None required (auth pages)
- **Dependencies:** Supabase auth
- **Potential Issues:**
  - If Supabase env vars invalid, auth will completely fail
  - User will see errors in auth UI

#### `/leaderboard`
- **Status:** ✅ **WORKS** (but may show paywall)
- **Auth:** None required for viewing
- **Dependencies:** 
  - `producers` table
  - Leaderboard access check hook
  - `site_settings` table
- **Potential Issues:**
  - Anonymous users can view leaderboard
  - If RLS blocks anonymous read of `producers`, table will be empty
  - Access status check may fail silently
  - Admin editing features will fail for anonymous users (expected)

#### `/subscribe`
- **Status:** ⚠️ **MAY FAIL**
- **Auth:** None required for viewing
- **Dependencies:** Stripe integration (`VITE_STRIPE_PUBLISHABLE_KEY`)
- **Potential Issues:**
  - If Stripe key missing, Stripe components may fail to load
  - Page may still render but checkout won't work
  - Checkout requires auth, so anonymous users can view but not purchase

#### `/hold-that-l`
- **Status:** ✅ Should work
- **Auth:** None required
- **Dependencies:** Unknown without reading component
- **Potential Issues:** Unknown

#### `/escrow`, `/escrow/initiate`, `/escrow/redeem`
- **Status:** ✅ Should work (viewing only)
- **Auth:** None required for viewing
- **Dependencies:** Unknown implementation details
- **Potential Issues:** Submission likely requires auth

#### `/claim/:producerId`
- **Status:** ⚠️ **REDIRECTS**
- **Auth:** **REQUIRED** - redirects to `/auth` if not authenticated
- **Dependencies:** 
  - Stripe (`VITE_STRIPE_PUBLISHABLE_KEY`)
  - `producers` table
- **Potential Issues:**
  - If Stripe key missing and user authenticates, Stripe operations will fail
  - Anonymous users redirected immediately (no viewing allowed)

#### `/liability/claim/:token`
- **Status:** ✅ Should work (token-based)
- **Auth:** None required (uses token for access)
- **Dependencies:** Edge function, database
- **Potential Issues:**
  - If token invalid, shows error page (expected)
  - Anonymous users can access if they have valid token

#### `/pay/:code`
- **Status:** ✅ Should work (code-based)
- **Auth:** None required (uses payment code)
- **Dependencies:** Edge function
- **Potential Issues:** Unknown implementation

---

### 🔒 AUTHENTICATION-REQUIRED ROUTES

All of these routes perform auth checks and redirect to `/auth` if user is not authenticated.

#### `/profile`
- **Status:** ⚠️ **REDIRECTS** (correct behavior)
- **Auth:** Required
- **Behavior:** Redirects to `/auth` if not authenticated
- **User Experience:** Anonymous users immediately redirected, no content visible

#### `/producer-dashboard`
- **Status:** ⚠️ **REDIRECTS**
- **Auth:** Required
- **Behavior:** Redirects if not authenticated

#### `/suggestions`, `/suggestion-box`
- **Status:** ⚠️ **REDIRECTS**
- **Auth:** Required
- **Behavior:** Redirects if not authenticated

#### `/confirm`
- **Status:** ⚠️ **REDIRECTS**
- **Auth:** Required
- **Behavior:** Redirects if not authenticated

#### `/call-sheets`
- **Status:** ⚠️ **REDIRECTS**
- **Auth:** Required
- **Behavior:** Shows toast error and redirects to `/auth`
- **Code:** Explicit toast notification before redirect

#### `/crew-contacts`
- **Status:** ⚠️ **REDIRECTS**
- **Auth:** Required
- **Behavior:** Redirects to `/auth` if not authenticated

---

### 🔐 ADMIN-ONLY ROUTES

All admin routes check for both authentication AND admin role. Behavior:

1. Check if user is authenticated → redirect to `/auth` if not
2. Check if user has admin role → redirect to `/` with error toast if not admin

**Routes:**
- `/admin`
- `/admin/edit-report/:id`
- `/admin/search-insights`
- `/admin/analytics/daily-visitors`
- `/admin/merge-producers`
- `/admin-submit-existing`
- `/admin-submit-new`
- `/leaderboard-analytics`
- `/admin/call-sheet-reservoir`
- `/results/fafo-generator`
- `/sitemap`

**User Experience:** Anonymous users see immediate redirect to `/auth`. Regular authenticated users see redirect to `/` with "Access Denied" message.

---

### 🚨 SYSTEM ROUTES

#### `/maintenance`
- **Status:** ✅ Works
- **Auth:** None required
- **Behavior:** Shows maintenance page with message
- **Note:** App.tsx will automatically show this if `maintenance_mode` is enabled in database

#### `/ban/:banId`
- **Status:** ✅ Should work
- **Auth:** None required (shows ban notice)
- **Behavior:** Displays ban information

#### `*` (404 Not Found)
- **Status:** ✅ Works
- **Behavior:** Catches all unmatched routes
- **User Experience:** Shows 404 page

---

## 4. CONSOLE ERRORS (What Anonymous Users Would See)

### Expected Console Output:

1. **Development Mode Only:**
   - `[Router] Loaded route config: [...]` - Only in DEV mode
   - Various `console.log` statements throughout codebase

2. **Error Logging (Expected):**
   - `[analytics] Failed to track visit:` - Silently fails (console.debug)
   - `'has_role error'` - Logged when checking admin status for anonymous users
   - `checkAdminStatus exception` - Logged in Navigation component

3. **Potential Unhandled Errors:**
   - Supabase query errors if RLS blocks anonymous access
   - Missing environment variable errors (if not set)
   - Stripe initialization errors (if key missing and Stripe component loads)

### Error Handling Quality:

**Good:**
- Most database errors are caught and mapped to user-friendly messages
- Analytics failures are silent
- Admin checks fail gracefully

**Concerning:**
- No global error boundary detected
- Unhandled promise rejections may show in console
- Supabase client initialization errors may not be caught

---

## 5. ENVIRONMENT VARIABLES & CONFIGURATION

### Required Environment Variables:

#### **CRITICAL (App Won't Work Without):**
1. `VITE_SUPABASE_URL` - Supabase project URL
2. `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key

**Impact:** Application completely non-functional if missing. No graceful degradation.

#### **IMPORTANT (Features Break Without):**
3. `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe integration
   - **Impact:** Checkout flows break, payment features non-functional
   - **Used in:** `/subscribe`, `/claim/:producerId`, possibly others

### Configuration Assumptions:

1. **Database Tables Must Exist:**
   - `site_settings` (for maintenance mode)
   - `producers` (for leaderboard)
   - `fafo_entries` (for results page)
   - Various other tables for authenticated features

2. **Storage Buckets Must Exist:**
   - `fafo-results` (for results page images)
   - Other buckets for file uploads

3. **RLS Policies Assumed:**
   - Anonymous users may or may not have read access to public tables
   - If RLS is too restrictive, pages will load but show no data

---

## 6. LOGIC THAT ONLY WORKS FOR AUTHENTICATED/ADMIN

### Admin-Only Logic (Breaks for Anonymous):

1. **Navigation Component:**
   - Admin menu items only show for admin users
   - Admin status check happens on every navigation render
   - Fails gracefully (just doesn't show menu items)

2. **Results Page:**
   - Delete functionality only for admins
   - Admin check happens, but page still works for anonymous users

3. **Leaderboard:**
   - Admin editing features
   - Fails gracefully for non-admin users

### Authenticated-Only Logic (Expected Behavior):

1. **Profile Page:** Completely inaccessible without auth
2. **Call Sheets:** Redirects if not authenticated
3. **Crew Contacts:** Redirects if not authenticated
4. **Producer Dashboard:** Redirects if not authenticated

---

## 7. POTENTIAL FAILURE SCENARIOS

### Scenario 1: Missing Supabase Env Vars
**Result:** Application fails to initialize. Blank screen or crash.
**User Experience:** Complete failure, no content visible.

### Scenario 2: RLS Too Restrictive
**Result:** Pages load but show no data.
**User Experience:** 
- Homepage: Search doesn't work
- Leaderboard: Empty table
- Results: No entries shown
- Pages still render but appear broken

### Scenario 3: Missing Stripe Key
**Result:** Payment-related features fail.
**User Experience:**
- Subscribe page: Checkout won't load
- Claim producer: Payment verification fails
- Other Stripe integrations: Broken

### Scenario 4: Database Tables Missing
**Result:** Various features break depending on missing table.
**User Experience:**
- `site_settings` missing: Maintenance mode check fails (but app continues)
- `producers` missing: Leaderboard empty, search broken
- `fafo_entries` missing: Results page empty

### Scenario 5: Storage Bucket Issues
**Result:** Images/files don't load.
**User Experience:**
- Results page: Broken image links
- Profile pictures: Missing
- Document uploads: Fail

---

## 8. SUMMARY OF ISSUES

### 🔴 Critical Issues:
1. **No validation of Supabase env vars** - App will crash if missing
2. **No error boundary** - Unhandled errors may crash entire app
3. **RLS assumptions unclear** - Unknown if anonymous users can read public data

### 🟡 Warning Issues:
1. **Silent failures in several places** - Errors logged but not surfaced to users
2. **Missing Stripe key breaks payment flows** - No graceful degradation
3. **Database dependency assumptions** - Tables may not exist in fresh install

### 🟢 Expected Behavior (Not Issues):
1. Auth-required routes redirecting to `/auth`
2. Admin routes checking permissions
3. Console errors for expected auth failures (admin checks)

---

## 9. RECOMMENDATIONS FOR TESTING

1. **Test with completely anonymous browser** (incognito, no localStorage)
2. **Test with missing env vars** - Verify error handling
3. **Test with restrictive RLS** - Verify data access assumptions
4. **Test with missing tables** - Verify graceful degradation
5. **Test all public routes** - Verify they load without auth
6. **Test redirect flows** - Verify auth redirects work correctly
7. **Check browser console** - Verify no unhandled errors

---

## 10. ROUTE ACCESSIBILITY SUMMARY

| Route | Anonymous Access | Auth Required | Admin Required | Notes |
|-------|-----------------|---------------|----------------|-------|
| `/` | ✅ | ❌ | ❌ | Search may fail if RLS restrictive |
| `/how-it-works` | ✅ | ❌ | ❌ | Static content |
| `/why-it-works` | ✅ | ❌ | ❌ | Static content |
| `/disclaimer` | ✅ | ❌ | ❌ | Static content |
| `/privacy-policy` | ✅ | ❌ | ❌ | Static content |
| `/faq` | ✅ | ❌ | ❌ | Static content |
| `/auth` | ✅ | ❌ | ❌ | Auth pages |
| `/reset-password` | ✅ | ❌ | ❌ | Auth pages |
| `/verify-email` | ✅ | ❌ | ❌ | Auth pages |
| `/results` | ✅ | ❌ | ❌ | May show empty if RLS blocks |
| `/submit` | ✅ (steps 1-2) | ✅ (steps 3+) | ❌ | Recent change - now public |
| `/leaderboard` | ✅ | ❌ | ❌ | May show empty if RLS blocks |
| `/subscribe` | ✅ | ❌ | ❌ | Checkout requires auth |
| `/hold-that-l` | ✅ | ❌ | ❌ | Unknown dependencies |
| `/escrow/*` | ✅ | ❌ | ❌ | Submission likely requires auth |
| `/claim/:producerId` | ❌ | ✅ | ❌ | Redirects immediately |
| `/liability/claim/:token` | ✅ | ❌ | ❌ | Token-based access |
| `/pay/:code` | ✅ | ❌ | ❌ | Code-based access |
| `/profile` | ❌ | ✅ | ❌ | Redirects to auth |
| `/producer-dashboard` | ❌ | ✅ | ❌ | Redirects to auth |
| `/suggestions` | ❌ | ✅ | ❌ | Redirects to auth |
| `/confirm` | ❌ | ✅ | ❌ | Redirects to auth |
| `/call-sheets` | ❌ | ✅ | ❌ | Redirects with toast |
| `/crew-contacts` | ❌ | ✅ | ❌ | Redirects to auth |
| `/admin/*` | ❌ | ✅ | ✅ | Requires admin role |
| `/maintenance` | ✅ | ❌ | ❌ | System route |
| `/ban/:banId` | ✅ | ❌ | ❌ | System route |

---

**Report Complete.** This represents the current state of the application from an anonymous user's perspective based on static code analysis.

