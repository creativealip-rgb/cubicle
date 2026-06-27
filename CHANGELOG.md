# Changelog

## 2026-06-27 — Internal localization + Docker redeploy

- Localized internal invoice UI (`/app/invoices`, `/app/invoices/[invoiceId]`) to Indonesian for owner/member workspace use.
- Replaced `$` symbol output in shared app currency formatter with ISO currency prefix for non-IDR currencies (e.g. `USD 1,000.00`) while keeping `Rp` for IDR.
- Added Indonesian date helper (`formatDateID`) and applied it to invoice list/detail dates.
- Localized invoice actions/modals: add item, import time entries, record payment, share-link generation/revoke, notes/terms empty state.
- Localized invoice status labels: `Terkirim`, `Dilihat`, `Terlambat`, `Lunas`, `Dibatalkan`, `Perlu dibayar`; `Draft` intentionally kept.
- Localized internal proposal pages (`/app/proposals`, `/app/proposals/new`, `/app/proposals/[proposalId]`) for headings, empty states, table labels, status date labels, outcome/decline text.
- Fixed accidental identifier replacements from broad copy pass (`hourlyRate`, `CardTitle`, `downPaymentPercent`, `declineReason`).
- Verified locally:
  - `npx tsc --noEmit` ✅
  - `npm run lint` ✅ (0 errors; 8 pre-existing `<img>` warnings)
  - `npm run build` ✅
- Committed and pushed:
  - `0e16805 fix: localize invoice and proposal UI`
- Docker production rebuild/recreate done on VPS:
  - image `cubicle-cubicle:latest` → `a7eaf5cd3a5e`
  - container `cubicle-cubicle-1` recreated and healthy
  - health check `https://cubiqlo.com/api/health` returned `{"status":"ok","db":"ok"}`

### Notes

- Public/client-facing routes are still intended to stay English unless product direction changes.
- Dokploy/Docker warning remains: Next.js `middleware` convention deprecated in favor of `proxy`; non-blocking.
- Existing lint warnings remain for `<img>` usage in landing/sidebar/auth components; unrelated to this change.
