# Cubiqlo — Ready-to-Test Pack (semua fitur)

**Live:** https://cubiqlo.com  
**Seed date:** 2026-07-17  
**Workspace:** QA Studio Manual Test (plan Solo)  
**Script seed:** `scripts/seed-qa-manual.mjs` (non-destructive)

---

## 1. Login (langsung copas)

| Role | Email | Password |
|---|---|---|
| **Owner (utama)** | `qa-owner-20260717@cubiqlo.test` | `QaCubiqlo!2026` |
| Member | `qa-member-20260717@cubiqlo.test` | `QaCubiqlo!2026` |
| Viewer (read-only) | `qa-viewer-20260717@cubiqlo.test` | `QaCubiqlo!2026` |

Login: https://cubiqlo.com/login

Verified API login owner = **200 + session cookie**.

---

## 2. Public links (incognito)

| Fitur | URL | Status seed |
|---|---|---|
| Client portal — Kopi Senja | https://cubiqlo.com/client-portal/d80c45ee79782f43b801545ce60ba6e6d2114f59ab78fabfafb1bcb3230d0331 | 200 |
| Client portal — Klinik Harmoni | https://cubiqlo.com/client-portal/5713f2ababe1a4731980354f48e6027e72b713578019ec4b781151bcfee5856e | 200 |
| Invoice sent (IDR) | https://cubiqlo.com/invoice/0cc6423e57c2a7bd005f145c393f79c1246c14d72fc55b65a38b1e297232dced | 200 |
| Invoice draft (USD) | https://cubiqlo.com/invoice/472d904a117b51cd1ecbac41ebb929e3427ef863081360739575ac863f37e544 | 200 |
| Proposal | https://cubiqlo.com/proposal/-lpbKm-4z59mPHWCpOSW1mb24QHJo9jn-r6j1KmOFD4 | 200 (fixed v0.1.39) |
| Contract (sign) | https://cubiqlo.com/contract/tRCarpFTgzXG-wGUBbI79WeNqSOPeA2t3ZEdmogOHfI | 200 |
| Intake questionnaire | https://cubiqlo.com/intake/5wJua6wnzzPa-AjgZxkRh-cGAfcTRTIKJYsKugEBeJ8 | 200 |
| Booking public | https://cubiqlo.com/booking/qa-studio-20260717 | 200 |

---

## 3. Data yang sudah di-seed (cek di app)

### Clients
1. **Rina Prameswari / Kopi Senja Roastery** — active, portal ON, slug `kopi-senja-qa`
2. **dr. Andi Harmoni / Klinik Harmoni** — active, portal ON, slug `klinik-harmoni-qa`
3. **Budi Santoso / PT Awan Digital** — inactive, portal OFF

### Projects
| Project | Client | Visible portal? | Status |
|---|---|---|---|
| Instagram Launch Campaign | Kopi Senja | YES | active |
| Brand Guideline Refresh | Kopi Senja | NO (internal) | active |
| Website Redesign | Klinik Harmoni | YES | active |
| SEO Monthly Retainer | Klinik Harmoni | YES | on_hold |
| Internal Ops Consulting | Awan Digital | NO | completed |

### Tasks
18 tasks: mix todo / in_progress / review / done / overdue / urgent.

### Time
6 entries (billable + non-billable + 1 active timer).

### Invoices
| Number | Status | Currency | Total |
|---|---|---|---|
| INV-QA-0001 | sent | IDR | 13.542.000 |
| INV-QA-0002 | draft | USD | 1.050 |
| INV-QA-0003 | paid | IDR | 2.220.000 |

### Expenses
6 expenses: Adobe IDR, Grab, Envato USD, photographer, lunch, coworking.  
Categories: Software, Travel, Production, Meals, Office.

### Pre-deal
- Proposal sent (public link — currently 500)
- Contract sent (public sign OK)
- Questionnaire + intake pending

### Calendar
- Availability Mon–Fri 09:00–17:00 Asia/Jakarta
- 2 appointments scheduled

### Packages
Social Starter 15jt · Website Launch 35jt · Retainer SEO 5jt

### Personal notes
- Follow up DP Kopi Senja (pinned)
- Daily log QA

---

## 4. Checklist test semua fitur (urut)

Pakai **Chrome admin** + **Incognito public**.

### A. Auth & shell
- [ ] Login owner → `/app/dashboard`
- [ ] Logout → login lagi
- [ ] Login member → data workspace sama
- [ ] Login viewer → create/edit ditolak / read-only
- [ ] Wrong password → error, no crash

### B. Dashboard / nav
- [ ] `/app/dashboard` KPI load
- [ ] Sidebar groups expand (active route)
- [ ] Workspace name **QA Studio Manual Test**

### C. Clients
- [ ] List 3 clients
- [ ] Search `Kopi`
- [ ] Open Kopi Senja → internal notes kelihatan di admin
- [ ] Edit phone
- [ ] Export PDF/list

### D. Projects
- [ ] 5 projects
- [ ] Open Instagram Launch → tasks/timeline
- [ ] Brand Guideline = client_visible OFF

### E. Tasks
- [ ] Kanban/list status
- [ ] Drag todo → in_progress → done
- [ ] Overdue task (Monthly SEO report) highlight
- [ ] Comment internal vs client

### F. Time
- [ ] List 6 entries
- [ ] Stop active timer
- [ ] Create manual entry
- [ ] Export CSV/PDF

### G. Files
- [ ] Upload 1 file client-visible ke Instagram Launch
- [ ] Upload 1 file internal
- [ ] Download
- [ ] Portal cuma lihat client-visible

### H. Expenses
- [ ] List + multi-currency (IDR + USD)
- [ ] Filter category Software
- [ ] Edit amount
- [ ] Create expense baru
- [ ] CSV export

### I. Invoices
- [ ] INV-QA-0001 sent → open detail → PDF
- [ ] Public invoice link (incognito)
- [ ] Record partial payment 9.000.000
- [ ] INV-QA-0002 draft USD format
- [ ] INV-QA-0003 paid
- [ ] Create invoice baru + line items
- [ ] Generate share link
- [ ] Manual remind

### J. Portal (incognito)
- [ ] Portal Kopi: project **Instagram Launch** muncul
- [ ] Project **Brand Guideline** TIDAK muncul
- [ ] Internal notes TIDAK bocor
- [ ] Invoice list
- [ ] Submit portal request

### K. Proposal
- [ ] `/app/proposals` list proposal seed
- [ ] Public link (KNOWN 500 — catat bug)
- [ ] Create proposal baru → send → open public

### L. Contract
- [ ] List contract
- [ ] Public link → sign as `Rina Prameswari` / `rina.prameswari@kopisenja.test`
- [ ] Status → signed
- [ ] PDF

### M. Questionnaire / intake
- [ ] `/app/questionnaires` form Brand Discovery
- [ ] Public intake submit:
  ```
  Nama brand: Kopi Senja Roastery
  Cerita: Specialty coffee local Bandung, warm & premium.
  Budget: 25-50jt
  Channel: Instagram, Offline
  Email PIC: rina.prameswari@kopisenja.test
  Target launch: 2026-08-15
  ```
- [ ] Response masuk admin

### N. Booking + calendar
- [ ] Public booking page slots
- [ ] Book slot:
  ```
  Name: Rina Prameswari
  Email: rina.prameswari@kopisenja.test
  Phone: 081298765432
  Notes: Bahas moodboard final
  ```
- [ ] Muncul di `/app/calendar`
- [ ] Double-book same slot ditolak

### O. Reports
- [ ] `/app/reports` collection/AR/expenses
- [ ] Angka sinkron invoice+expense

### P. Templates / packages / email / prompts
- [ ] `/app/templates` tabs
- [ ] `/app/packages` 3 packages
- [ ] `/app/prompts` generate caption
- [ ] `/app/email` draft/send (kalau Resend aktif)
- [ ] Contract template default ada

### Q. AI
- [ ] AI panel / brain
- [ ] Chat: `Ringkas task overdue saya`
- [ ] Chat: `Berapa total expense Software?`
- [ ] Solo plan AI limit behavior

### R. Personal / journal / support / billing
- [ ] Personal notes pinned
- [ ] Journal entry
- [ ] Support ticket create
- [ ] `/app/billing` plan Solo + upgrade CTA

### S. Mobile (390px)
- [ ] Dashboard, clients, tasks, invoice, expenses, public portal

### T. Security
- [ ] `/app` tanpa login → redirect
- [ ] Portal token random → 404
- [ ] Internal notes tidak di public invoice/portal

---

## 5. Copy-paste data tambahan (kalau create baru)

### Client baru
```
Nama: Sinta Maharani
Perusahaan: Studio Cahaya
Email: sinta@studiocahaya.test
Telepon: 081377788899
Website: https://studiocahaya.test
Alamat: Jl. Asia Afrika No. 1, Bandung
Tags: photo, video
Internal notes: [INTERNAL] Prefer transfer BCA.
```

### Project baru
```
Nama: Product Catalog Shoot
Client: Studio Cahaya
Status: active
Billing: project
Currency: IDR
Budget: 12000000
Client visible: ON
```

### Invoice item
```
Description: Half-day product shoot
Qty: 1
Unit price: 4500000
Tax: 11
```

### Expense
```
Amount: 275000
Currency: IDR
Description: Props + backdrop rental
Category: Production
Vendor: Sewa Alat Bandung
```

---

## 6. Known issue

| Issue | Detail | Status |
|---|---|---|
| Public proposal 500 | `formatMoney` function di-pass ke Client Component | **FIXED v0.1.39** |

---

## 7. Re-seed (kalau mau reset QA)

```bash
cd /root/projects/cubicle
DBPASS=$(docker exec cubicle-pg printenv POSTGRES_PASSWORD)
NET=$(docker inspect cubicle-pg --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}')
docker run --rm --network "$NET" \
  -v /root/projects/cubicle:/w -w /w \
  -e DATABASE_URL="postgresql://postgres:${DBPASS}@cubicle-pg:5432/cubicle" \
  -e APP_URL=https://cubiqlo.com \
  -e QA_PASSWORD='QaCubiqlo!2026' \
  node:22-bookworm-slim \
  node scripts/seed-qa-manual.mjs
```

Re-run **hanya hapus** user/workspace QA email hari itu, **bukan** data production lain.

---

## 8. Definition of done manual

PASS kalau:
1. Owner login + dashboard OK  
2. Client → project → task → time jalan  
3. Invoice PDF + public link + payment  
4. Portal isolation (internal hidden)  
5. Contract public sign  
6. Booking + double-book guard  
7. Expense multi-currency  
8. Intake submit  

FAIL known: public proposal page (500) — catat, jangan block sisa test.