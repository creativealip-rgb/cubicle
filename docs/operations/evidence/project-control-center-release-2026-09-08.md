# Project Control Center Release — 2026-09-08

## Scope

- Added Overview as default Project Detail tab with model-aware KPI strip, project details, billing settings, invoice/retainer progress, and recent records.
- Removed duplicate header task progress and retained one Task Progress KPI with a `No tasks yet` empty value.
- Split General Info and Billing Settings into focused dialogs backed by the same Project form, validation, and update action.
- Aligned Project KPI typography, icon treatment, tabs, count badges, and operational-tab card surfaces with Client Detail conventions.
- Added canonical empty states for empty Tasks and Invoices tabs without duplicate CTA buttons.
- Added `Restore Project` for archived projects; active projects retain `Archive`.
- Simplified Add Client to a progressive create form while preserving the complete Edit Client form.

## Production Releases

| Commit | Change | Image |
|---|---|---|
| `c2f5d9b` | Model-aware Project Overview KPI | `cubiqlo-prod:sha-c2f5d9b` |
| `ac3bc88` | Aligned Project Overview footer actions | `cubiqlo-prod:sha-ac3bc88` |
| `d2565df` | Progressive Add Client form | `cubiqlo-prod:sha-d2565df` |
| `a120d11` | Billing Settings and Invoice/Retainer Progress separation | `cubiqlo-prod:sha-a120d11` |
| `3793565` | Separate Project Details and Billing Settings dialogs | `cubiqlo-prod:sha-3793565` |
| `2f4a741` | Canonical Project KPI and operational-tab surfaces | `cubiqlo-prod:sha-2f4a741` |
| `19ba5b2` | Project tabs aligned with Client Detail | `cubiqlo-prod:sha-19ba5b2` |
| `13312d4` | Tasks/Invoices empty states and Restore Project action | `cubiqlo-prod:sha-13312d4` |

## Verification

- Full Vitest suite: **385 files, 1,764 tests passed**.
- Focused Project Overview and empty-tab contracts: **9 tests passed**.
- ESLint: passed.
- Next.js production build: passed.
- Production health: `{ "status": "ok", "db": "ok" }`.
- Pre/post deploy proxy checks: passed; only `dokploy-traefik` remains public proxy.

## Known Follow-up

- Tasks and Invoices use shared `EmptyState` inside operational tab surface. Visual review against Time tab indicates the nested border may need flattening for exact parity; no claim of exact visual parity is made in this release.
- Restore browser mutation was not performed because authorized QA workspace had no archived Project fixture. Action wiring, authorization path, build, and contract coverage passed.
