# Leaked Liability

[![Integration Tests](https://github.com/levijawara/leakedliability/actions/workflows/integration-tests.yml/badge.svg?branch=main)](https://github.com/levijawara/leakedliability/actions/workflows/integration-tests.yml)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Platform-3ECF8E?logo=supabase&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-Escrow-635BFF?logo=stripe&logoColor=white)

Leaked Liability is a production-industry accountability platform for tracking unpaid or late payments, improving transparency, and helping crews, vendors, and producers resolve payment disputes faster.

## Problem -> Solution

### Problem
Freelancers and vendors in production often have fragmented, private, and inconsistent visibility into payment behavior across producers and companies.

### Solution
Leaked Liability provides a structured, user-driven system for:

- Reporting payment timelines and outcomes
- Surfacing accountability data in a public leaderboard
- Enabling secure escrow-assisted resolution flows
- Giving admins tooling to moderate, verify, and manage risk

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, React Router
- **UI:** Tailwind CSS, shadcn/ui, Radix UI
- **Data/auth:** Supabase (Postgres, Auth, Realtime, Storage)
- **Payments:** Stripe
- **Testing:** Vitest
- **Tooling:** ESLint, tsx scripts

## Key features

- Public leaderboard and transparency views
- Report submission and confirmation flows
- Liability claim and liability arena workflows
- Escrow initiation, payment, and redemption
- Producer dashboard and profile/account flows
- Admin dashboards (report editing, producer merge, analytics, network graph)
- Call sheet manager and reservoir workflows (beta-gated)
- Security and reliability validation helpers for env, storage, and RLS assumptions

## Architecture (high level)

```mermaid
flowchart TD
    U[User Browser] --> FE[React + Vite Frontend]
    FE --> SA[Supabase Auth]
    FE --> DB[Supabase Postgres]
    FE --> RT[Supabase Realtime]
    FE --> ST[Supabase Storage]
    FE --> EF[Supabase Edge Functions]
    EF --> STRIPE[Stripe]
    EF --> EXT[Email/Analytics Integrations]
```

### Repository layout

```text
src/
  components/     Reusable UI and feature components
  pages/          Route-level pages and flows
  lib/            App utilities and domain helpers
  config/         Runtime/env configuration and validation
  integrations/   External clients (including Supabase client wiring)
supabase/
  migrations/     Database migrations
  functions/      Edge Functions for backend workflows
tests/
  integration/    Integration tests (checkout and escrow paths)
docs/             Security and launch diagnostics
```

## Quickstart

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a `.env.local` file:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_STRIPE_PUBLISHABLE_KEY=... # required for payment flows
```

### 3) Run development server

```bash
npm run dev
```

### 4) Run quality checks

```bash
npm run lint
npm run test:integration
```

### 5) Build for production

```bash
npm run build
```

## What I built

- Designed and implemented the frontend architecture for multi-flow user journeys (public reporting, claims, escrow, admin)
- Built resilient client-side guards around environment configuration, Supabase connectivity, and role-based access
- Integrated payment workflows with Stripe-backed escrow paths
- Implemented operational tooling for call sheet workflows, analytics surfaces, and admin moderation actions
- Shipped the product with security-focused checklists and diagnostics documentation

## Frontend engineering highlights

- **Flow orchestration:** Implemented route-level UX for public, authenticated, admin, escrow, and beta-gated paths without fragmenting the core app shell.
- **Reliability-by-default:** Added startup env/config checks and backend assumption validation to catch misconfiguration early.
- **Operational UX:** Built admin and observability-oriented surfaces (analytics, network graph, diagnostics links) to support day-2 operations.
- **Guarded access patterns:** Enforced auth/admin/beta access requirements through reusable route wrappers and context providers.
- **Maintainable structure:** Kept `pages`, `components`, `lib`, and `config` concerns clearly separated for iterative product velocity.

## Screenshots

Add screenshots in `docs/screenshots/` and reference them here:

- `docs/screenshots/leaderboard.png`
- `docs/screenshots/submit-report.png`
- `docs/screenshots/admin-dashboard.png`
- `docs/screenshots/escrow-flow.png`

Screenshot capture guidance: `docs/screenshots/README.md`

## Architecture decisions

- High-level decision log: `docs/ARCHITECTURE_DECISIONS.md`

## Notes

- This platform hosts user-submitted production payment data and includes legal/privacy/disclaimer pages in-app.
- For operational and security context, see:
  - `docs/SECURITY_SCORECARD_AND_LAUNCH_CHECKLIST.md`
  - `SECURITY_FIXES_COMPLETED.md`
  - `PRODUCTION_DIAGNOSTICS_REPORT.md`
