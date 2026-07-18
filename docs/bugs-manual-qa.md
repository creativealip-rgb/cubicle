# Cubiqlo — Bugs + Kekurangan (Manual QA Backlog)

Status: **P0–P3 mostly fixed through v0.1.50** (2026-07-18)  
Live: Docker `cubicle-cubicle-1` healthy  
Sumber: manual QA Alip + Coder  
Workspace acuan: **Alip Testing** (`alipdevcom@gmail.com`)

---

## Progress snapshot (v0.1.41 → v0.1.50)

| Ver | Fokus |
|---|---|
| 0.1.42 | P0 critical (plan limit, portal enable, upload, timer, cascade, sheet Select) |
| 0.1.43 | P1 invoice/client/logo/notes/rate/reports |
| 0.1.45 | P2 task/time/files/team/portal activation/onboarding |
| 0.1.46 | P3 soft-fail, stale action, questionnaire mobile, money labels, journal mood, portal request approval |
| 0.1.47 | Portal: hapus comment → WA/Email contact only |
| 0.1.48 | Portal Recent Activity compact (3 default, group spam) |
| 0.1.49 | Portal contact copy clean (no “gak nerima komentar”) |
| 0.1.50 | Portal task approve / minta revisi on status `review` |

---

## P0 — critical / broken (FIXED)

### BUG-001 — Plan limit UX projects
**Status:** fixed  
Banner + upgrade → `/app/billing`; soft error toast on create.

### BUG-002 — Portal enable on client create
**Status:** fixed  
Checkbox default ON; insert sets `portalEnabled` + token.

### BUG-003 — Upgrade button clients
**Status:** fixed  
Link ke `/app/billing`.

### BUG-004 — File upload network fail
**Status:** fixed  
CSP allow R2 + same-origin proxy `POST /api/files/upload`.

### BUG-005 — Expense receipt upload fail
**Status:** fixed  
Same-origin proxy `POST /api/expenses/receipt`.

### BUG-006 — Timer loncat 8jam / 32jam
**Status:** fixed  
Manual entry set `endTime`; active timer query exclude `manual_minutes`; legacy rows closed.

### BUG-007 — Time filter client→project→task
**Status:** fixed  
Manual entry + timer widget cascade ketat, no fallback all.

### BUG-008 — Task sidebar Select auto-close sheet
**Status:** fixed  
Shared `portaled-popper-guard` on Dialog + Sheet.

---

## P1 — core flow jelek / setengah jadi (FIXED)

### BUG-009 — Invoice create loading lama
**Status:** fixed  
Skeleton `/app/invoices/new/loading.tsx` + button “Membuat invoice…”.

### BUG-010 — Invoice edit meta no save
**Status:** fixed  
`InvoiceMetaForm` save status/tax/notes/terms.

### BUG-011 — Logo branding URL only
**Status:** fixed  
Workspace branding form + `POST /api/workspace/logo` R2 upload.

### BUG-012 — Public invoice logo/contact mismatch
**Status:** fixed  
Public invoice uses workspace logo + billing contact.

### BUG-013 — Client edit dialog scroll/close
**Status:** fixed  
`ClientEditDialog` scroll + auto-close on save.

### BUG-014 — Package currency hardcode IDR
**Status:** fixed  
Default package currency = workspace currency.

### BUG-015 — Expense tabs jump
**Status:** fixed  
Lighter tab transition.

### BUG-016 — Notes list dense / expand broken
**Status:** fixed  
Compact list + expand + tab state.

### BUG-017 — Delete toast English generic
**Status:** fixed  
ID toast copy.

### BUG-018 — Sidebar PERSONAL i18n
**Status:** fixed  
`Catatan` / `Jurnal`.

### BUG-019 — Time → invoice rate 0
**Status:** fixed  
Rate fallback: entry → project hours rate → workspace `defaultHourlyRate`.

### BUG-020 — Reports multi-currency sum
**Status:** fixed  
No cross-currency sum; labels per currency.

---

## P2 — product depth (FIXED v0.1.45+)

### PROD-003 — Menu Penjualan terlalu luas → HOLD
### PROD-004 — Task vs time edukasi UI
**Status:** fixed (v0.1.45)  
Banner helper di Tasks + Time Tracking.
### PROD-005 — Time tags opsional
**Status:** fixed (v0.1.45)  
Tag opsional di timer + manual entry; chip preset; no default hardcode.
### PROD-006 — Files daily driver
**Status:** fixed (v0.1.45)  
Filter + toggle visibility/type; deliverable auto client-visible.
### PROD-007 — Team invite usable
**Status:** fixed (v0.1.45)  
Plan gate UX + email undangan Resend; pending-signup path.
### PROD-008 — Portal activation + file + approval loop
**Status:** fixed (v0.1.46 request approval; v0.1.50 task approve)  
Activation UX + full link. Portal request type `approval` + task `review` Setujui/Minta revisi.
### PROD-009 — Onboarding guided first-win
**Status:** fixed (v0.1.45)  
Step portal klien di dashboard checklist.

---

## P3 — nice / nanggung

- Journal first-class — **fixed** (v0.1.46 mood filter)
- Questionnaire polish — **fixed** (v0.1.46 mobile cards + i18n)
- Dashboard money clarity per currency — **fixed** (v0.1.46 labels)
- Mobile form density — **partial** (questionnaires cards; more screens later)
- Stale Server Action hard refresh — **fixed** (v0.1.46 helper + error boundary)
- Error handling campur throw vs `{ok:false}` — **partial** (clients + projects soft-fail)

### Portal UX follow-ups (done v0.1.47–0.1.50)
- Hapus comment client portal → WA/Email only (**v0.1.47**)
- Recent Activity compact 3/5 + group task spam (**v0.1.48**)
- Contact copy clean (**v0.1.49**)
- Task approve/revisi di portal (**v0.1.50**)

---

## Belum dicek / hold

| Area | Risiko |
|---|---|
| Kalender | availability seed ada; booking UX unknown |
| Brain | AI quality/cost unknown |
| Prompt | template/gen flow unknown |
| Menu Penjualan | HOLD (PROD-003) |
| Soft-fail pattern full app | partial (clients/projects only) |

---

## Pola bug berulang

| Pola | Status |
|---|---|
| Dialog/Sheet + portaled dropdown auto-close | **fixed** (shared guard) |
| Upload network fail | **fixed** (CSP + proxy) |
| Limit plan UX | **fixed** clients+projects |
| Filter parent→child | **fixed** time |
| Client dialog scroll/close | **fixed** |
| Invoice meta save + logo | **fixed** |
| Notes collapse | **fixed** |
| Portal badge review tanpa aksi | **fixed** (v0.1.50 task approve) |

---

## Manual QA quick (portal v0.1.50)

1. Hard refresh portal client
2. Project badge **Menunggu review kamu** → expand Tasks
3. Task status `review` → **Setujui** / **Minta revisi** + note
4. Hubungi Tim = tombol WA/Email saja (no comment copy)
5. Recent Activity max 3 + expand
6. Files: hanya visibility `client` di project accordion, download pakai token
