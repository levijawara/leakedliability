# Architecture Decisions (Frontend + Platform)

This document captures high-level technical choices and tradeoffs in Leaked Liability.

## 1) React + TypeScript + Vite for product velocity

**Decision:** Build the web app as a typed React SPA, bundled with Vite.  
**Why:** Fast iteration speed, strong TypeScript ergonomics, and straightforward deployment workflows.  
**Tradeoff:** SPA routing and client-side state complexity require careful reliability handling.

## 2) Supabase as the backend foundation

**Decision:** Use Supabase for Auth, Postgres, Realtime, Storage, and Edge Functions.  
**Why:** Keeps product teams focused on domain logic instead of backend infrastructure plumbing.  
**Tradeoff:** Schema, RLS, and function contracts must stay aligned with frontend expectations.

## 3) Route-driven product architecture

**Decision:** Organize major capabilities as route-level pages (`src/pages`) backed by shared components and utilities.  
**Why:** Maintains clean separation between product flows (public, authenticated, admin, escrow, call sheets).  
**Tradeoff:** Requires disciplined route/access control and consistent shared abstractions.

## 4) Reliability-first runtime checks

**Decision:** Validate environment variables and key backend assumptions early at app startup.  
**Why:** Fail fast in misconfigured environments and reduce silent production failure modes.  
**Tradeoff:** Slightly more startup logic and operational logging complexity.

## 5) Stripe-backed escrow for payment flows

**Decision:** Integrate escrow/payment workflows through Stripe and edge-function orchestration.  
**Why:** Trusted payment rails and clear separation between frontend UX and sensitive payment handling.  
**Tradeoff:** Requires careful environment management and explicit test coverage for payment pathways.

## 6) Security and ops documentation as first-class artifacts

**Decision:** Keep security scorecards and diagnostics reports in-repo (`docs/`, root reports).  
**Why:** Improves operational continuity, onboarding clarity, and audit readiness.  
**Tradeoff:** Documentation must be maintained as the system evolves.
