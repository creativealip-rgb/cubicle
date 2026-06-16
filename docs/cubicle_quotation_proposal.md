# Proposal & Quotation — Cubicle Client Operation Hub

## 1. Project Summary

Cubicle adalah web app client operation hub untuk freelancer, agency kecil, konsultan, dan small team.

Tujuan utama:
> Semua kerjaan client dari task sampai invoice dalam satu workspace.

Aplikasi mencakup internal workspace untuk team dan client portal untuk client.

## 2. Scope Pekerjaan

### A. Foundation
- Setup Next.js App Router + TypeScript
- Setup Tailwind CSS + shadcn/ui
- Setup Neon Postgres + Drizzle ORM
- Setup Better-Auth
- Setup Cloudflare R2 private storage
- Setup environment, deployment, dan migration

### B. Auth & Workspace
- Signup
- Login
- Logout
- Forgot password
- Workspace onboarding
- Workspace switcher
- Role basic: owner, member, viewer
- Protected routes

### C. Client Management
- Client CRUD
- Client detail page
- Client status
- Client notes
- Portal enable/disable
- Portal token generation/revoke

### D. Project & Task Management
- Project CRUD
- Project status
- Project progress calculation
- Task CRUD
- Task kanban board
- Task list view
- Task drawer/detail
- Task assignment
- Task priority/status/due date
- Client visibility toggle

### E. Comments
- Internal comments
- Client-visible comments
- Portal comments with name/email
- Comment visibility rules

### F. File Management
- Upload file to Cloudflare R2 private bucket
- File visibility: internal/client
- Secure signed download URL
- File size validation max 25 MB
- Basic folder support depth <= 1

### G. Time Tracking
- Start/stop timer
- One running timer per user per workspace
- Manual time entry
- Billable/non-billable toggle
- Timesheet page
- Billable summary
- CSV export

### H. Invoicing
- Invoice CRUD
- Invoice item CRUD
- Invoice number generation per workspace
- Import billable time into invoice
- Prevent duplicate time import
- Auto-recalculate subtotal/tax/total
- Payment record
- Mark paid
- PDF invoice export
- Shared invoice link with hashed token

### I. Client Portal
- Public portal via token
- Token hash storage only
- Token expiry/revoke
- Portal access logs
- View shared projects
- View visible tasks
- View shared files
- View client-visible comments
- View invoice via shared link
- Hide all internal data

### J. Appointment Booking
- Availability rules
- Public booking page
- Slot validation
- DB-level double-booking prevention
- Appointment list
- Basic email notification

### K. Prompt Generator
- Prompt templates
- Prompt generator form
- OpenAI-compatible API integration
- Track model/tokens/cost
- Monthly AI cap
- Save generations to project

### L. Dashboard & UI Polish
- Dashboard metrics
- Recent activity
- Active timer card
- Upcoming appointments
- Unpaid invoices
- Empty states
- Loading states
- Error states
- Responsive layout

## 3. Out of Scope MVP

Tidak termasuk dalam harga MVP:
- Payment gateway
- Google Calendar sync
- WhatsApp integration
- Mobile app native
- Automation builder
- Advanced role matrix
- White-label portal
- Social media publishing
- Forms builder advanced
- Realtime chat full
- E-signature/legal signing

Fitur di atas bisa masuk Phase 2 dengan quotation terpisah.

## 4. Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Neon Postgres
- Drizzle ORM
- Better-Auth
- Cloudflare R2
- Server Actions
- Zod validation
- OpenAI-compatible API
- Vercel deployment

## 5. UI/UX Direction

Design direction:
> ClickUp power, Notion calm, Stripe billing clarity.

Karakter UI:
- clean SaaS dashboard
- client-centric, bukan task-centric
- simple dan professional
- responsive desktop/mobile web
- client portal minimal dan mudah dipakai

Core layout:
- sidebar navigation
- topbar search/action/timer
- dashboard widget
- task kanban + drawer
- invoice builder
- client portal public view

## 6. Estimated Timeline

Estimasi pengerjaan: **8–12 minggu**

Breakdown:

| Phase | Scope | Estimasi |
|---|---|---:|
| Sprint 1 | Foundation, auth, app shell | 1–2 minggu |
| Sprint 2 | Workspace, client, project, task | 2 minggu |
| Sprint 3 | Comments, files, time tracking | 2 minggu |
| Sprint 4 | Invoice + client portal | 2–3 minggu |
| Sprint 5 | Appointment, prompt, dashboard, polish | 1–2 minggu |
| QA & deployment | Testing, bugfix, deploy | 1 minggu |

Timeline bisa berubah sesuai revisi dan kecepatan feedback client.

## 7. Investment / Harga

### Recommended Package — MVP Build

**Harga project: Rp 85.000.000**

Termasuk:
- semua scope MVP di atas
- UI responsive desktop/mobile web
- database schema + migration
- deployment setup
- basic security/access guard
- 2x round revisi UI minor
- 1 bulan bugfix support setelah handover

### Payment Terms

| Termin | Persentase | Nominal |
|---|---:|---:|
| DP sebelum mulai | 40% | Rp 34.000.000 |
| Setelah Sprint 3 selesai | 30% | Rp 25.500.000 |
| Sebelum final handover | 30% | Rp 25.500.000 |

Total: **Rp 85.000.000**

## 8. Optional Add-ons

| Add-on | Harga |
|---|---:|
| Maintenance bulanan | Rp 3.500.000 / bulan |
| Support prioritas + minor improvement | Rp 5.000.000 / bulan |
| Custom branding lebih detail | +Rp 7.500.000 |
| White-label client portal | +Rp 12.500.000 |
| Payment gateway integration | +Rp 15.000.000 |
| Google Calendar sync | +Rp 12.500.000 |
| WhatsApp notification | +Rp 10.000.000 |
| Advanced report/dashboard | +Rp 10.000.000 |
| Mobile app wrapper/TWA | +Rp 20.000.000 |

## 9. Client Responsibilities

Client menyediakan:
- brand/logo/color preference
- contoh invoice format jika ada
- copy/content dasar
- akses domain/DNS jika perlu
- API keys pihak ketiga bila digunakan
- feedback maksimal 2 hari kerja per review cycle

Biaya pihak ketiga ditanggung client:
- Neon Postgres
- Cloudflare R2
- Vercel
- email provider
- AI API usage
- domain

## 10. Warranty & Support

Termasuk 1 bulan bugfix support setelah handover.

Bugfix mencakup:
- error teknis dari scope yang disepakati
- issue akses/login
- issue data yang tidak sesuai flow
- issue deploy yang terkait implementasi

Tidak termasuk bugfix:
- fitur baru
- perubahan scope besar
- revisi desain besar setelah approval
- issue dari provider pihak ketiga
- perubahan karena policy/API pihak ketiga

## 11. Acceptance Criteria

Project dianggap selesai jika:
- user bisa signup/login/logout
- user bisa membuat workspace
- user bisa membuat client/project/task
- user bisa upload dan download file via signed URL
- user bisa track time manual/timer
- user bisa membuat invoice dari billable time
- invoice total benar setelah item berubah
- PDF invoice bisa dibuat
- client portal hanya menampilkan data visible/shared
- booking page mencegah double booking
- prompt generator berjalan dan mencatat usage
- dashboard metrics tampil
- app deployed dan bisa diakses client

## 12. Notes

Harga ini untuk MVP production-ready versi awal. Pengembangan lanjutan disarankan lewat maintenance atau Phase 2.

Validitas quotation: 14 hari sejak tanggal dikirim.
