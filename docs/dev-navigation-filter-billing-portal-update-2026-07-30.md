# Cubiqlo Dev Navigation, Filters, Billing QA, and Portal Update

Date: 30 July 2026

Environment: `https://dev.cubiqlo.com`

Branch: `dev/integration`

## Scope

This update consolidates the latest authenticated dev work across sidebar navigation, Project/Task list filters, Task detail UX, billing-model QA, and Client Portal terminology.

## Navigation

Desktop navigation now renders each module group as a stable parent. Child links appear inline only when the current route belongs to that group:

- Pekerjaan: Klien, Proyek, Tugas
- Keuangan: Invoice, Pengeluaran, Laporan
- Personal: Catatan, Jurnal, Landing Page
- AI: Asisten, Prompt Studio

The previous covering flyout/popover behavior was removed. Mobile keeps compact accordions.

## Compact table filters

### Projects

Removed the separate status tabs, client dropdown, and billing-model filter row. Filters now live in table headers:

- Klien → client filter
- Status → project status filter
- Progres → billing model filter
- Proyek and Jatuh Tempo retain sorting

### Tasks

Removed the separate Status, Priority, Project, and Assignee filter row. These filters now live in matching table headers. The following controls remain above the table:

- Semua / Sekali selesai / Aktivitas berulang
- Daftar / Papan

Both control groups are aligned in one row on desktop. Active query filters render as labeled chips with one `Hapus filter` action; behavior and view state are preserved.

## Task detail

The duplicate `Mulai timer dari task` control was removed from the Task side sheet. Time tracking remains available from the dedicated Waktu page and topbar.

## Billing QA

An isolated QA account was used through real browser forms:

- `QA Hourly Project`: Hourly, IDR 250,000/hour
- `QA Retainer Project`: Retainer, IDR 5,000,000 fee, 2,400 included minutes, monthly reset day 1
- One task per project
- Five manual time entries per project
- Each project totals 375 minutes across five entries

A runtime defect was found during this flow: Retainer creation validated configuration but did not persist its Retainer columns, causing the database check constraint to reject creation. The create action now persists fee, included minutes, monthly period unit, reset day, overage policy, and optional overage rate.

## Client Portal

Portal copy and hierarchy now match canonical billing terminology:

- Per proyek → Fixed Price
- Per jam → Hourly
- Per paket → Retainer
- Invoice ke → Invoice
- Request → Permintaan
- Akses aman now uses a small lock badge
- Ajukan Pertemuan is primary; Minta Laporan is secondary
- Empty project state advises the client to contact the workspace manager

Explicitly excluded by product direction:

- No internal explanation of the `Terlihat oleh klien` toggle was added
- Metric cards were not reduced or hidden

## Verification evidence

- Focused Vitest wiring tests passed for sidebar, table filters, active-filter summary, Task timer removal, Retainer persistence, and portal copy
- TypeScript passed
- Next.js Docker production builds passed during each deploy
- Authenticated Project/Task UI browser QA passed
- Client Portal password gate and authenticated portal passed on desktop and 390 px mobile
- Client Portal desktop/mobile console errors: 0
- Client Portal desktop/mobile horizontal overflow: 0 px
- `dokploy-traefik` remained sole owner of public ports 80/443
- Production container identity remained unchanged during dev deploys

## Git and deployment ledger

| Commit | Change |
|---|---|
| `ebd1523` | Initial inline Work navigation |
| `33ca5ac` | Persist Retainer project configuration |
| `e1900af` | Route-active inline submenu pattern for all groups |
| `a5520a2` | Consolidate list filters into table headers |
| `cb02d39` | Align Task views and summarize active filters |
| `6b861c1` | Remove Task detail timer action |
| `12812c8` | Polish Client Portal labels and actions |

Current deployed revision: `12812c8a3d2a5048eaf2e7f988983174be193bee`

Current dev image: `sha256:b08e3e181a6fbf13e9f3c1925550b50427907fe401fd42387658c3397f08876c`
