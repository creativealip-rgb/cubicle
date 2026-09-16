# Cubiqlo Admin Growth KPI Dashboard Design

## Goal

Upgrade Cubiqlo Admin Dashboard from a small platform snapshot into a funnel dashboard covering acquisition, activation, engagement, monetization, retention, and growth. Never invent unavailable metrics.

## Scope

### Phase 1 — Historical DB-derived metrics

Build accurate metrics from existing production records with date ranges `7d`, `30d`, `90d`, and `12m`.

- Executive funnel: signups → activated workspaces → paid accounts.
- Activation: first client, project, task, invoice, time log, and portal activity.
- Engagement: active users/workspaces, projects per workspace, tasks per project, time tracking adoption, portal usage.
- Monetization: free-to-paid conversion, MRR, ARR, ARPU, completed payments.
- Retention: retained paid accounts, churn, cohort retention, and reactivation when derivable from payment history.
- Growth: net paid-account growth and MRR growth.

### Phase 2 — Forward event instrumentation

Add an analytics event table and capture acquisition/referral context going forward.

- Landing/page visit.
- Signup started/completed.
- UTM source, medium, campaign.
- Referrer.
- Referral identifier.
- Meaningful activation events.

Visitor conversion, organic acquisition percentage, referral rate, and CAC remain unavailable until enough event/cost data exists.

## Metric Units

- Business funnel and monetization use workspace/account as unit.
- Product engagement may use user or workspace, labeled explicitly.
- Currency metrics use completed plan payments only and normalize annual payments to monthly equivalents.

## Activation Definition

A workspace is activated when it has:

1. At least one client.
2. At least one project.
3. At least one of: task, invoice, time entry, or client portal visit.

Activation date is the timestamp when all three conditions first become true.

## Date Range Semantics

- Signups and new activation use events occurring inside selected range.
- Snapshot metrics such as MRR use range-end state.
- Engagement means meaningful product activity inside range, not login alone.
- Comparison shows percentage change against immediately preceding equal-length period.
- `12m` uses calendar-month buckets.

## Dashboard Layout

1. Header with range selector and data-freshness timestamp.
2. Executive KPI strip: signups, activated, paid, MRR, ARR, churn.
3. Funnel card: signups → activated → paid, with conversion and drop-off.
4. Six grouped sections matching requested KPI taxonomy:
   - Acquisition
   - Activation
   - Engagement
   - Monetization
   - Retention
   - Growth
5. Monthly trend chart and activation/cohort tables.
6. Unavailable metrics render `Not tracked yet` with reason, never `0`.

## Existing Data Mapping

- Signups: `users.created_at`.
- Workspaces: `workspaces` and membership ownership.
- Activation milestones: `clients`, `projects`, `tasks`, `invoices`, `time_entries`, `portal_visits`.
- Paid conversion/MRR/ARR/ARPU: completed `pakasir_payments` with `payment_type = 'plan'`.
- Churn/reactivation: payment and entitlement history where timestamps provide defensible state transitions.

## Query Architecture

- Keep admin authorization and distributed rate limiting.
- Replace monolithic KPI query with bounded CTE queries grouped by domain.
- Return one typed dashboard payload.
- Aggregate in PostgreSQL; do not load raw platform rows into Node.js.
- Add indexes only where query plans prove they are needed.
- Cache only after correctness is established; first release remains dynamic.

## Accuracy Rules

- Every card includes metric definition in tooltip/help copy.
- Missing source data is `unavailable`, not zero.
- Do not estimate CAC without marketing spend input.
- Do not infer visitors from signup count.
- Do not classify login as engagement.
- Existing MRR annualization remains: monthly amount + yearly amount / 12.

## Error Handling

- Whole dashboard fails closed if authorization fails.
- One unsupported metric cannot break supported sections.
- Query failure renders an explicit admin error state and logs server-side details without secrets.

## Verification

- Pure metric tests for activation, conversion, MRR, ARR, ARPU, churn, and previous-period comparisons.
- SQL fixture tests covering empty, free-only, paid, annual, churned, and reactivated accounts.
- Admin authorization test.
- Responsive browser QA on desktop and mobile.
- Production read-only comparison against direct aggregate SQL before release.

## Non-goals

- Third-party analytics vendor integration.
- Marketing spend management in Phase 1.
- Retrospective reconstruction of visitor/referral data that was never recorded.
- User-facing analytics changes.

## Release Plan

1. Ship Phase 1 DB-derived dashboard.
2. Validate production totals against direct SQL.
3. Add Phase 2 event schema/instrumentation separately.
4. Enable acquisition/referral cards only after sufficient real data exists.
