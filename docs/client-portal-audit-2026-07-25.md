# Client Portal Audit Closure — 2026-07-25

## Scope

Audit dan hardening route publik `GET /client-portal/[token]` pada desktop dan mobile 390 px. Cakupan: Ringkasan, Proyek, File, Invoice, Kontak, server actions, endpoint upload/download/PDF, analytics, query database, aksesibilitas, dan isolasi workspace/client.

## Production target

- Live: `https://app.cubiqlo.com/client-portal/surya-digital`
- Branch: `fix/navbar-notification-dashboard-reminders`
- Implementation commits: `745e13e`, `b84e801`
- Container: `cubicle-cubicle-1`
- Public proxy: `dokploy-traefik`

## Resolved findings

### Security and tenant isolation

- `createPortalRequest` validates that `clientId` belongs to the active workspace.
- Optional `projectId` must belong to the selected client and workspace.
- File download validates portal token and records analytics only after successful access.
- File queries are scoped by workspace, client, visible project IDs, and `visibility=client`.
- Invoice PDF access rejects draft invoices and validates invoice ownership by workspace/client.
- Internal request metadata such as `[CLIENT_ORIGIN ...]` is stripped before rendering.

### Analytics correctness

- Portal page load no longer creates one `portalVisits` row per visible file.
- Portal page load no longer mutates file `lastViewedAt` or sends false first-view notifications.
- File-view analytics and first-view notification run only after valid file download.
- Invoice `clientFirstViewedAt` is written only when the client opens its PDF.
- General portal visits use the separate `portal_open` resource type.
- Production DB verification showed `portal_open` events without file resources from page load.

### Backend performance

Removed per-project query loops for:

- Tasks
- Client-visible files
- Project timeline/activity
- Time-entry summaries
- Packages

Rows are fetched in batched domain queries and grouped by project in one pass. Helpers are covered by regression tests in `src/lib/portal-presentation.test.ts`.

### Ringkasan

- Active requests are separated from completed history.
- History is collapsed under `Riwayat request`.
- Internal metadata is hidden.
- Labels and actions are localized.
- Header and summary density are mobile-safe.

### Proyek

- Project hierarchy and 100% progress status are clearer.
- Fully completed active projects show `Menunggu penutupan`.
- Task and file sections are collapsible.
- Task/File counts are visible in section summaries.
- Billing labels and progress copy are Indonesian.
- Mobile project title and status hierarchy no longer compete for the same row.

### File

- Tab label is `File`, not `Folders`.
- Breadcrumb root is `Semua`.
- Upload destination and 25 MB limit are explicit.
- Download control is one valid interactive element, not nested link/button markup.
- Download links include accessible labels/titles.
- Project/file status labels are localized.

### Invoice

- Mobile card layout and PDF actions are touch-safe.
- Payment history is collapsible.
- Opening portal page does not mark invoices viewed.
- No Pay/online-payment action was added; payment remains manual by product decision.

### Kontak

- WhatsApp/email prefill uses the correct company/workspace context.
- Official-channel guidance and useful message instructions are shown.
- Internal `Settings` wording was removed from public fallback copy.
- WhatsApp and Email controls meet 44 px mobile touch target.

### Cross-tab/mobile

- Tabs use Indonesian labels and counts.
- Active tab scrolls into view.
- Left/right fades indicate horizontal tab navigation.
- Inactive tab panels are no longer force-mounted in the DOM.
- Mobile QA at 390 px reported `scrollWidth=390` with no page-level horizontal overflow.
- Audited primary controls are at least 44 px high.

## Verification evidence

```text
npx tsc --noEmit                 PASS
npx vitest run                   PASS — 88 tests
npm run build                    PASS
Docker image build               PASS
docker compose up -d cubicle     PASS
GET /api/health                  200 — {"status":"ok","db":"ok"}
Portal route                     200
Mobile QA viewport               390 px
Mobile page scrollWidth          390 px
Public 80/443 owner              dokploy-traefik only
Unrelated 9Router routing        normal response
```

## Main files

- `src/app/client-portal/[token]/page.tsx`
- `src/lib/actions/portal-requests.ts`
- `src/app/api/files/[fileId]/download/route.ts`
- `src/app/api/client-portal/invoices/[invoiceId]/pdf/route.ts`
- `src/components/portal/portal-tabs.tsx`
- `src/components/portal/portal-request-list.tsx`
- `src/components/portal/project-accordion.tsx`
- `src/components/portal/portal-file-manager.tsx`
- `src/components/portal/portal-file-list.tsx`
- `src/components/portal/portal-invoices.tsx`
- `src/components/portal/portal-contact.tsx`
- `src/lib/portal-presentation.ts`
- `src/lib/portal-presentation.test.ts`

## Deliberate non-change

`src/app/client-portal/[token]/page.tsx` was not mechanically split into a new loader/service after runtime queries were batched. A large file extraction would add regression risk without changing current user behavior. This remains optional internal refactoring, not an open production defect.

## Current status

Audit findings affecting users, security, analytics correctness, query performance, accessibility, and mobile behavior are closed and deployed.
