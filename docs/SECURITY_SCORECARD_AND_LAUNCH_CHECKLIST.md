# Leaked Liability — Security Scorecard & Launch Checklist

**Generated:** Defensive review only. No exploit instructions.  
**Scope:** Repo + Supabase config (migrations, edge functions, RLS, auth).  
**Use:** Harden before launch; re-check after major changes.

---

## 1. Score: **72 / 100** — “Solid baseline, fix the open doors before launch”

**What the number means:**

| Band   | Score  | Meaning |
|--------|--------|--------|
| 90–100 | Locked | RLS + auth + rate limits + logging aligned; no known public PII or unguarded functions. |
| 70–89  | **You are here** | Good RLS and auth story; a few high-impact gaps (public data, unguarded endpoints, rate limits). |
| 50–69  | Risky | Multiple gaps; one good abuse path could cause real damage. |
| 0–49   | Don’t launch | Critical gaps (e.g. broad PII exposure, admin by convention only). |

**Why 72:**

- **Strengths:** RLS on all tables, Supabase Auth + JWT, role checks via `has_role()`, Stripe webhook signature verification, `public_leaderboard` view excludes PII, RequireAuth + ban check, audit/moderation logs, sanitized errors, storage by `auth.uid()`.
- **Deductions:** `producers` table is publicly readable (RLS `SELECT USING (true)`), so email/phone are exposed if the client or any script hits the table directly (§2). Several edge functions have `verify_jwt = false` with no other strong guardrails (§2). Rate limiting is narrow/disabled. Ban enforcement is client-side only for initial gate; server-side re-check on sensitive actions is incomplete.

**Receipts (where the score comes from):**

- RLS: `export/policies.sql` — `producers`: “Public can view producers” FOR SELECT USING (true). No column-level restriction; anon key + `from('producers').select('*')` returns all columns.
- Public leaderboard is safe: `supabase/migrations/20260103003935_...sql` — `public_leaderboard` view selects only id, name, company, sub_name, scores, amounts, dates; no email/phone.
- Client uses view for leaderboard: `src/pages/Leaderboard.tsx` uses `from("public_leaderboard")` for the main list; `from('producers')` is only used for admin-style update in authenticated context.
- JWT-off functions: `supabase/config.toml` — `send-email`, `process-liability-claim`, `track-visit`, `check-grace-periods`, `create-escrow-checkout`, `create-producer-escrow-session`, `queue-processor`, `watchdog-call-sheets`, `send-arena-notification`, `generate-arena-transcript`, `sync-youtube-views` have `verify_jwt = false`.
- Webhook: `supabase/functions/leaderboard-stripe-webhooks/index.ts` — uses `stripe.webhooks.constructEventAsync(raw, sig, whsec)`; rejects missing/bad signature.
- RequireAuth: `src/components/RequireAuth.tsx` — checks `account_status` (banned/suspended), then `has_role(..., 'admin')` / beta via RPC; all client-side. No server-side ban check in every sensitive edge function.

---

## 2. Top 5 “Most likely to bite you” risks

1. **Public `producers` SELECT**  
   RLS allows anyone with the anon key to `SELECT *` from `producers`. That includes email and any other PII in that table. Your app uses `public_leaderboard` for the leaderboard, but the table itself is open.  
   **Fix:** Remove “Public can view producers” and grant SELECT only via a safe view (e.g. `public_leaderboard` / `public_producer_search`) or authenticated/admin policies. If you need anon read for search, use a view that explicitly excludes PII and document it.

2. **Unguarded public edge functions**  
   `send-email`, `track-visit`, and a few others have `verify_jwt = false`. `send-email` is intended for “internal” edge-to-edge calls but is callable by anyone who can hit the URL. No shared secret or rate limit in code.  
   **Fix:** For each `verify_jwt = false` function: (a) restrict to internal/cron only (e.g. Supabase cron, or VPC/allowlist), or (b) add a shared secret header and reject missing/invalid, and (c) add rate limiting so abuse is bounded.

3. **Ban enforcement only at the UI gate**  
   Bans are enforced in `RequireAuth` (client). A banned user can still call authenticated endpoints (e.g. submissions, reports) if they keep a valid JWT.  
   **Fix:** In every edge function that performs sensitive or state-changing actions, after resolving the user from the JWT, check `profiles.account_status` (or equivalent) and reject if banned/suspended.

4. **No rate limiting on high-value endpoints**  
   No rate limits on report submission, liability claim processing, or public `send-email`/`track-visit`. Enables scraping, spam, or DoS.  
   **Fix:** Add rate limits (per IP and/or per user) for: report/claim submission, `send-email`, `track-visit`, and any other public or high-abuse-risk endpoints. Prefer Supabase/Edge or gateway-level limits; document and test.

5. **Cron/internal functions reachable from internet**  
   `queue-processor`, `watchdog-call-sheets`, `sync-youtube-views` have `verify_jwt = false` and are likely invoked by cron. If the URLs are public, anyone can trigger them.  
   **Fix:** Invoke them only via Supabase cron or a trusted scheduler; or add a strong shared secret (e.g. in header) and reject requests without it. Do not rely on “nobody will find the URL.”

---

## 3. Top 10 fixes ranked by impact/effort

| # | Fix | Impact | Effort | Where |
|---|-----|--------|--------|-------|
| 1 | Restrict `producers` SELECT to views or authenticated/admin only | High | Low | New migration: drop “Public can view producers”; add policy that allows SELECT only on a PII-free view or for authenticated/admin. |
| 2 | Add server-side ban check in sensitive edge functions | High | Medium | Each sensitive function: after `getUser()`, query `profiles` for `account_status`, return 403 if banned/suspended. |
| 3 | Protect `send-email`: secret header or internal-only | High | Low | Require e.g. `x-internal-secret` (env var); reject if missing/wrong. Or call only from other functions with same secret. |
| 4 | Rate limit report/claim submission and `track-visit` / `send-email` | High | Medium | Supabase Edge or gateway: per-IP and/or per-user limits; document and test. |
| 5 | Restrict cron-only functions (queue-processor, watchdog, sync-youtube) | Medium | Low | Invoke only from Supabase cron; or require a cron-only secret header and reject others. |
| 6 | Ensure all admin edge functions verify admin via `has_role()` server-side | Medium | Low | Audit every admin function: after JWT, call `has_role(auth.uid(), 'admin')` (or equivalent) and reject if false. |
| 7 | Harden `process-liability-claim`: token lifecycle + rate limit | Medium | Medium | Confirm tokens are single-use or short-lived; add rate limit per IP/token. |
| 8 | Enable and tune call-sheet upload rate limiting in production | Medium | Low | Turn on existing rate limit when not in seeding mode; remove or tightly scope admin bypass. |
| 9 | Add audit log entries for sensitive actions (e.g. ban, revoke, payment confirm) | Medium | Low | Ensure every such action writes to `audit_logs` with actor and action. |
| 10 | Document and test Google OAuth redirect URLs and Supabase auth config | Medium | Low | See §5; avoid wrong redirect = token leakage or broken login. |

---

## 4. Launch checklist (Google OAuth + Supabase)

Use this before going live with Google sign-in and production Supabase.

**Supabase Dashboard (Authentication):**

- [ ] **Providers:** Google enabled; Client ID and Client Secret set (from Google Cloud Console).
- [ ] **Redirect URLs:** Add your production site URL(s), e.g. `https://yourdomain.com/**`, and any staging URLs you use. No stray localhost in production config.
- [ ] **Site URL:** Matches production (e.g. `https://yourdomain.com`).
- [ ] **JWT expiry:** Reasonable (e.g. 1h); refresh flow tested.
- [ ] **Email confirmations:** If you require email verification, confirm redirect links use production domain.

**Google Cloud Console (OAuth):**

- [ ] **OAuth consent screen:** Production app name, support email, and (if applicable) verification status.
- [ ] **Authorized redirect URIs:** Include Supabase callback URL, e.g. `https://<project-ref>.supabase.co/auth/v1/callback`.
- [ ] **Authorized JavaScript origins:** Include production origin (e.g. `https://yourdomain.com`).

**Env / config:**

- [ ] **No dev keys in production:** Use production Supabase URL and anon key; service role and Stripe keys only in server/edge env.
- [ ] **Stripe:** Live keys and webhook secret in production; webhook endpoint uses HTTPS and signature verification (already in place).

**Quick test:**

- [ ] Sign in with Google on production URL; confirm redirect and session.
- [ ] Sign out and sign in again; confirm no redirect to localhost or wrong domain.

---

## 5. “If you only do 3 things tonight”

1. **Close the `producers` leak**  
   Add a migration that drops the policy “Public can view producers” and replaces it with a policy that allows SELECT only for authenticated users, or only via a view that does not expose email/phone. Ensure all client reads for “public” leaderboard/search use that view (you already use `public_leaderboard` for the main leaderboard; double-check any other anon reads).

2. **Guard `send-email`**  
   In `send-email/index.ts`, require a header (e.g. `x-internal-secret`) that matches a secret in env. Reject with 401 if missing or wrong. Set that secret in Supabase secrets and in any other edge function that calls `send-email`.

3. **Add server-side ban check to one critical path**  
   Pick one high-impact authenticated action (e.g. “submit report” or “process liability claim” if called with JWT). In that edge function, after resolving the user from the JWT, query `profiles` for `account_status` and return 403 if banned/suspended. Then replicate the pattern for the rest of sensitive functions.

---

## 6. What this document is not

- **Not** a guarantee that no vulnerabilities exist.
- **Not** a substitute for penetration testing or a formal audit if you have compliance needs.
- **Not** permission or instructions to exploit anything; it’s defensive only.

Re-score after you’ve applied the top fixes (e.g. producers SELECT, send-email guard, ban check) and again after any major feature or auth change.
