# Admin Growth KPI Dashboard Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build an admin funnel dashboard with accurate DB-derived acquisition, activation, engagement, monetization, retention, and growth metrics.

**Architecture:** PostgreSQL performs bounded aggregate queries through typed admin actions. Server-rendered admin UI consumes one payload and labels unavailable metrics honestly. Phase 1 changes no production schema; acquisition event storage stays separate Phase 2 work.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM, PostgreSQL, Vitest, Tailwind/shadcn.

---

### Task 1: Lock metric contracts with tests

**Objective:** Define range, activation, money, conversion, comparison, and unavailable-metric semantics before query work.

**Files:**
- Create: `src/lib/admin-growth-metrics.ts`
- Create: `src/lib/admin-growth-metrics.test.ts`

**Steps:**
1. Write failing tests for `7d/30d/90d/12m` range boundaries, activation requirement, safe percentages, MRR/ARR/ARPU, and unavailable values.
2. Run `npx vitest run src/lib/admin-growth-metrics.test.ts`; expect FAIL.
3. Add small pure helpers and exported payload types.
4. Re-run; expect PASS.
5. Commit `test: define admin growth metric contracts`.

### Task 2: Add DB-derived admin analytics query

**Objective:** Return one range-aware dashboard payload without loading raw platform rows into Node.

**Files:**
- Modify: `src/lib/actions/admin/dashboard.ts`
- Create: `src/lib/actions/admin/dashboard.test.ts`

**Steps:**
1. Add source/wiring tests requiring admin auth, rate limit, bounded range parsing, activation CTE, previous-period comparison, and plan-payment filters.
2. Run focused test; expect FAIL.
3. Implement SQL CTE aggregates for signups, activation milestones, active workspaces/users, project/task ratios, time/portal adoption, paid accounts, MRR, ARR, ARPU, completed payments, paid retention/churn/reactivation where history permits.
4. Return explicit unavailable acquisition/CAC/referral values.
5. Run focused tests, typecheck, and query against production read-only.
6. Commit `feat: add admin growth analytics query`.

### Task 3: Build range-aware KPI dashboard UI

**Objective:** Replace snapshot tiles with executive funnel and six KPI families.

**Files:**
- Modify: `src/app/(admin)/admin/dashboard/page.tsx`
- Create: `src/components/admin/growth-kpi-dashboard.tsx`
- Create: `src/components/admin/growth-kpi-dashboard.test.tsx`

**Steps:**
1. Add wiring tests for range selector, executive KPIs, funnel, six sections, comparisons, tooltips, and `Not tracked yet` states.
2. Run focused test; expect FAIL.
3. Implement server range parsing and compact responsive dashboard.
4. Use semantic cards, tabular numbers, no chart dependency; native CSS bars/sparklines only if data supports them.
5. Run focused tests, lint, and typecheck.
6. Commit `feat: build admin growth KPI dashboard`.

### Task 4: Validate production metric accuracy

**Objective:** Prove dashboard totals match direct SQL.

**Files:**
- Create: `scripts/verify-admin-growth-kpis.ts`
- Create: `docs/operations/evidence/admin-growth-kpis-2026-09-16.md`

**Steps:**
1. Write read-only script comparing action aggregates with independent SQL checks.
2. Run for `7d`, `30d`, `90d`, and `12m` against production DB without printing personal data.
3. Record PASS/PARTIAL/BLOCKED per metric and explain unavailable metrics.
4. Commit `test: verify admin growth KPI aggregates`.

### Task 5: Release verification

**Objective:** Ship only after source, runtime, and browser gates pass.

**Files:**
- Modify only if verification finds defects.

**Steps:**
1. Run focused tests, full TypeScript, touched-file ESLint, `git diff --check`, and production build.
2. Run deployment guardrails and pre-deploy check.
3. Build from clean commit SHA and deploy through existing `dokploy-traefik` route without host ports.
4. Verify internal/public health and exact image SHA.
5. Browser-check admin dashboard desktop/mobile, all ranges, no overflow, no console/page errors.
6. Compare visible KPI values with read-only SQL evidence.
7. Commit any QA fixes separately, push, rebuild, redeploy, and repeat gates.

### Deferred Phase 2

Separate spec/plan after Phase 1 proves useful:
- analytics event schema;
- visitor/signup/UTM/referrer/referral capture;
- marketing spend input;
- CAC, organic acquisition %, referral rate;
- historical event retention and privacy policy.

## Acceptance Gates

- Activated workspace = client + project + one of task/invoice/time entry/portal visit.
- Range and previous period are exact and non-overlapping.
- MRR uses completed plan payments; yearly amount divided by 12.
- ARR = MRR × 12; ARPU denominator explicitly labeled paid accounts.
- Login alone never counts as engagement.
- Missing visitor/referral/spend data displays `Not tracked yet`, never `0`.
- All aggregate SQL remains workspace/account scoped where applicable.
- Production UI values match independent read-only SQL.
- No schema migration in Phase 1.
