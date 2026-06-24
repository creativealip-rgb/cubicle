# Cubicle — Client Operations Hub

> **Status:** Production beta live · **URL:** https://cubiqlo.com
> **Stack:** Next.js 16 · React 19 · Drizzle ORM + PostgreSQL · Better Auth · Tailwind v4 · shadcn/ui · Dokploy + Docker · Cloudflare R2 · Resend · Playwright/Vitest · **AI Assistant (9router + ag/gemini-3-flash)**

---

## 🧠 Overview

Cubiqlo (repo masih `cubicle`) adalah SaaS client operations hub — satu workspace untuk mengelola client, project, task, file, time tracking, invoice, booking, client portal, proposal, questionnaire, contract/e-sign, finance report, AI prompt generator, dan AI Assistant.

Target user: freelancer, agency kecil, software/design studio, marketing team, dan konsultan yang butuh client work rapi tanpa pindah-pindah tool.

---

## 🔐 Authentication

Better Auth v5 — email/password login.

```
GET  /login
GET  /signup
GET  /forgot-password
POST /api/auth/[...all]
```

**Demo user (seed):**

| Role   | Email                | Password      |
|--------|----------------------|---------------|
| Owner  | owner@cubicle.test   | `password123` |
| Member | member@cubicle.test  | `password123` |
| Viewer | viewer@cubicle.test  | `password123` |

All demo users belong to workspace **Acme Creative Studio** (`acme-creative`).

**Role permission:**

| Action              | Owner | Member | Viewer |
|---------------------|:-----:|:------:|:------:|
| Read all            | ✅     | ✅      | ✅      |
| Create client/project/task/file/invoice | ✅ | ✅ | ❌ |
| Edit anything       | ✅     | ✅      | ❌      |
| Delete anything     | ✅     | ✅      | ❌      |
| Manage team (add/remove member) | ✅ | ❌ | ❌ |
| Time tracking       | ✅     | ✅      | ❌      |
| Generate invoice share token | ✅ | ✅ | ❌ |
| Record payment      | ✅     | ✅      | ❌      |
| AI Prompt Generator | ✅     | ✅      | ❌      |
| AI Assistant (chat)  | ✅     | ✅      | ❌      |

---

## 🌐 Localization / Bahasa

Split bahasa berdasarkan route:

### Indonesian (internal — `(app)/app/` routes)
Dashboard, Clients, Invoices, Tasks, Projects, Settings, Time, Files, Reports, Billing.
Target user: freelancer/agency Indonesia.

### English (client-facing — public token/slug routes)
Invoice PDF, Invoice viewer, Client Portal, Proposal, Contract, Booking, Intake form, Email templates.
Target user: international clients.

Tidak pakai i18n library — hardcode string per context. Cukup buat MVP.

---

## 📊 Dashboard

```
GET /app/dashboard
```

Ringkasan instant (full Indonesian UI):
- **Klien Aktif** — jumlah klien
- **Project Aktif** — jumlah proyek
- **Task Jatuh Tempo** — task yang overdue / due soon
- **Invoice Belum Dibayar** — invoice belum paid

Fitur dashboard:
- Greeting dinamis (Selamat pagi/siang/malam + nama user)
- Quick actions: Task baru, Invoice baru, Mulai timer, Tambah klien
- Attention needed: Invoice terlambat, Task hari ini, Kontrak menunggu, Notifikasi belum dibaca
- Revenue sparkline (14 hari terakhir)
- Kesehatan klien (Sehat / Diam / Berisiko)
- Proyeksi arus kas (30/60/90 hari)
- Aktivitas Terbaru
- Timer Aktif + Jadwal Mendatang
- Invoice Belum Dibayar
- Task Hari Ini

---

## 🏢 Clients

### List
```
GET /app/clients
```
Tabel semua klien dengan nama, company, email, status, projects count.

### Detail
```
GET /app/clients/[clientId]
```
Detail satu klien termasuk:
- Info dasar (nama, company, email, phone, address)
- Portal token management (generate / revoke)
- Associated projects

### Actions
- **Add Client** — owner/member only
- **Edit Client** — owner/member only
- **Portal Token** — generate token untuk client portal access

---

## 📁 Projects

### List
```
GET /app/projects
```
Tabel semua proyek dengan nama, klien, status, progress.

### Detail
```
GET /app/projects/[projectId]
```
Detail proyek termasuk:
- Info dasar
- Associated tasks (kanban)
- Files
- Comments
- Client visibility toggle

### Actions
- **New Project** — owner/member only
- **Edit Project** — owner/member only
- **Set Client Visibility** — kontrol apakah proyek muncul di client portal

---

## ✅ Tasks

```
GET /app/tasks
```

Kanban board dengan kolom:
- **Backlog**
- **Todo**
- **In Progress**
- **In Review**
- **Done**

Fitur:
- Drag & drop antar kolom (@dnd-kit)
- Assign member
- Priority (low/medium/high/urgent)
- Due date
- Client visibility toggle
- Comment thread per task

---

## 📎 Files

```
GET /app/files
```

Internal file manager per project.

### Upload
- **Visibility:** `Internal` (hanya workspace) atau `Client` (muncul di portal)
- **File Type:** `Working File` atau `Deliverable`
- Badge UI: Internal / Client / Deliverable

### Download security
```
GET /api/files/[fileId]/download?token=PORTAL_TOKEN
```

Access control:
- Workspace member (session) → ✅
- Client portal (valid token + file visibility=client) → ✅
- No auth / wrong token → ❌ 403

### Storage
- Upload menggunakan R2 (Cloudflare) signed URL
- Penyimpanan: `workspaces/{workspaceId}/files/{fileId}/{filename}`

---

## ⏱️ Time Tracking

```
GET /app/time
```

Fitur:
- **Active Timer** — Start / Stop time entry (real-time tick di topbar)
- **Manual Entry** — Input durasi manual
- **Timesheet** — List semua time entries
- **CSV Export** — Export time entries ke CSV
- **Hourly Rate** — Set rate per entry (digunakan untuk invoice)

### Timer lifecycle:
1. Start → timer aktif (muncul di topbar)
2. Stop → save sebagai time entry
3. Invoice import → status jadi `invoiced`

> **Note:** Pause/resume ditunda ke Phase 2.

### Topbar Timer Widget
- Timer aktif: button merah dengan waktu berjalan
- Klik → langsung ke `/app/time`
- Update setiap 1 detik, sync setiap 15 detik

---

## 💰 Invoices

```
GET /app/invoices
GET /app/invoices/[invoiceId]
```

### Invoice lifecycle

| Status     | Arti                            |
|------------|---------------------------------|
| `draft`    | Baru dibuat, belum dikirim      |
| `sent`     | Share token sudah digenerate    |
| `viewed`   | Client sudah buka shared link   |
| `paid`     | Pembayaran lunas                |
| `overdue`  | Melewati due date               |
| `cancelled`| Dibatalkan manual               |

### Fitur invoice:
- Auto numbering (INV-0001, INV-0002, ...)
- Counter per workspace, thread-safe
- Tambah item (description, qty, unit price)
- Import time entries → otomatis jadi invoice item
- Hitung subtotal, tax, total otomatis
- Record payment — auto status `paid` kalau total lunas
- Generate share token (30 hari default)
- Revoke share token
- Public invoice page via token

### Public invoice:
```
GET /invoice/[token]
```
Client bisa lihat invoice tanpa login. Auto update status `sent` → `viewed`.

---

## 📅 Calendar & Appointments

```
GET /app/calendar
```

### Availability rules:
- Set jam kerja per hari (Senin-Minggu)
- Public booking berdasarkan rule ini

### Public booking page:
```
GET /booking/acme-creative
```
- Client pilih tanggal → lihat slot tersedia
- Isi nama, email, judul appointment
- Submit → appointment tersimpan, redirect ke success page
- Auto-assign ke workspace owner

---

## 🔗 Client Portal

```
GET /client-portal/[token]
```

Client bisa akses tanpa login, menggunakan portal token.

Yang muncul:
- Nama/perusahaan client
- Projects (hanya `clientVisible=true`)
- Tasks per project (hanya `clientVisible=true`)
- Files per project (hanya `visibility=client`)
- Deliverable badge untuk file `file_type=deliverable`
- Shared invoices (yang punya active share token)
- Comment form — client bisa kirim komentar (source=portal)

Portal token management:
- Generate token via client detail page
- Expiry configurable
- Revoke kapan saja
- Access logged ke `portal_access_logs`

---

## 🤖 AI Assistant (v1.2 — Sprint F.3)

> See `docs/ai-assistant.md` for full reference. Quick summary below.

Floating sparkle button (bottom-right of every `/app/*` page) → chat panel.

**v1.2 adds**: workspace fuzzy search (pg_trgm), prompt library tools, voice input (Web Speech API), stop streaming, token display, export conversation to `.md`. Total **15 tools** (10 entity, 2 action, 3 utility).

**Capabilities:**
- Read tools (10): list clients/projects/tasks/invoices + entity drill-down + team lookup
- Action tools (2): mark task done, draft invoice reminder — both require user confirm in UI
- Conversation persistence (per-user, auto-titled from first message, history sidebar)
- Multi-turn context (last 20 messages sent to model)
- Terse responses, IDR-formatted, entity names not raw IDs

**Stack:**
- Model: `ag/gemini-3-flash` via 9router (OpenAI-compatible, internal Docker URL)
- Architecture: agentic RAG — model calls structured tool functions over Drizzle queries (no embeddings)
- Schema: `ai_conversations` + `ai_messages` tables
- Cost: ~$0.01 per question, 1k Qs ≈ $10/mo

**Try it:** click sparkle button → "How's the business?" or "Tell me about Kopi Senja".

---

## 🤖 Prompt Generator

```
GET /app/prompts
```

AI-powered content generation.

### Provider:
- **9Router** (local proxy) → model `ag/gemini-3-flash`
- OpenAI-compatible API

### Template system:
- 3 built-in templates: **Social Caption**, **Copywriting**, **Email Marketing**
- Variabel dinamis (e.g., `{{product_name}}`, `{{tone}}`)
- Fill template → generate → output

### Usage tracking:
- Token usage (input/output)
- Monthly cap: **$50**
- Cost estimation per generation
- History dengan filter per project

### Technical:
- API key via mounted secret file (`/run/secrets/9router_api_key`)
- Fallback: auto-detect OPENAI_API_KEY / NINE_ROUTER_API_KEY / ROUTER_API_KEY
- SSE response parsing (9router Gemini returns streaming chunks)

---

## 💳 Billing & Payments (Pakasir)

```
GET /app/billing
POST /api/billing/checkout
POST /api/webhooks/pakasir
```

Pakasir QRIS payment gateway untuk upgrade plan workspace.

### Plans

| Plan  | Harga       | Limit              |
|-------|-------------|---------------------|
| Free  | Rp 0        | 3 klien max         |
| Solo  | Rp 49rb/bln | Unlimited klien, 1 user |
| Team  | Rp 99rb/bln | Unlimited klien, 5 users |

### Checkout flow
1. Owner klik "Bayar Solo/Team QRIS" di `/app/billing`
2. `POST /api/billing/checkout` → create Pakasir transaction
3. Redirect ke Pakasir QRIS page
4. User bayar via QRIS
5. Pakasir kirim webhook ke `/api/webhooks/pakasir`
6. Webhook verify → update `workspace.plan` + `plan_expires_at` (+30 hari)
7. `pakasir_payments` table tracks all transactions

### Guards
- Same plan → blocked (409)
- Downgrade → blocked (409)
- Upgrade (free→solo, free→team, solo→team) → allowed walau plan belum expired
- Free plan checkout → blocked (400)
- Non-owner → blocked (403)

### Webhook endpoint
```
POST https://cubiqlo.com/api/webhooks/pakasir
```
Set di Pakasir dashboard sebagai callback URL.

---

## ⚙️ Settings / Team Management

```
GET /app/settings
```

**Owner only:**
- Add member by email → pilih role (member/viewer)
- Change member role
- Remove member
- Owner self protected (tidak bisa remove/change self)

---

## 🏗️ Technical Architecture

### Stack
```
Next.js 16 (App Router)
├── Better Auth v5 (email/password)
├── Drizzle ORM + PostgreSQL
├── Tailwind CSS v4 + shadcn/ui
├── @dnd-kit (kanban drag & drop)
├── @react-pdf/renderer (invoice PDF)
├── AWS SDK S3 (R2 storage)
├── Resend (email — noreply@cubiqlo.com verified)
└── 9Router (AI provider gateway)
```

### Database
- PostgreSQL 16 via Docker (`cubicle-pg`)
- 26 tables (added `ai_conversations` + `ai_messages` + `pakasir_payments`)
- Migrations via Drizzle
- AI tables migration: `scripts/migrate-ai-tables.sql`

### Deployment
```
Docker + Dokploy + Traefik
├── Container: cubicle-mvp (Node.js, port 3000)
├── Container: cubicle-pg (PostgreSQL, port 5432)
├── Network: dokploy-network
├── TLS: Let's Encrypt via Traefik
└── Host: cubiqlo.com (sslip.io redirects to canonical domain)
```

### Build pipeline
```bash
npm run lint          # ESLint
npx tsc --noEmit      # TypeScript check
npx next build        # Production build
docker compose up -d --build  # Deploy
```

### Current build status
```
lint:    PASS
tsc:     PASS
build:   PASS (verified 2026-06-23)
unit:    PASS (17 Vitest tests)
e2e:     PASS (13 Playwright tests)
deploy:  PASS (Docker Compose, cubicle-cubicle-1 healthy)
```

---

## 🔑 Environment Variables

| Variable            | Status          | Deskripsi                        |
|---------------------|:---------------:|----------------------------------|
| DATABASE_URL        | ✅ Set          | PostgreSQL connection            |
| BETTER_AUTH_URL     | ✅ Set          | Auth base URL                    |
| BETTER_AUTH_SECRET  | ✅ Set          | Auth secret key                  |
| OPENAI_API_BASE     | ✅ Set          | 9Router endpoint                 |
| R2_ACCOUNT_ID       | ✅ Set          | Cloudflare R2 account            |
| R2_ACCESS_KEY_ID    | ✅ Set          | R2 access key                    |
| R2_SECRET_ACCESS_KEY| ✅ Set          | R2 secret key                    |
| R2_BUCKET_NAME      | ✅ Set          | R2 bucket name                   |
| RESEND_API_KEY      | ✅ Set          | Email provider                   |
| EMAIL_FROM / RESEND_FROM | ✅ Set    | `noreply@cubiqlo.com` sender      |
| AI_API_KEY          | ✅ Set          | 9router key (AI Assistant)       |
| AI_BASE_URL         | ✅ Set          | 9router base URL                 |
| AI_MODEL            | ✅ Set          | `ag/gemini-3-flash`              |
| PAKASIR_PROJECT     | ✅ Set          | `cubiqlo` project slug           |
| PAKASIR_API_KEY     | ✅ Set          | Server-side Pakasir API key      |
| NEXT_PUBLIC_APP_URL | ✅ Set          | `https://cubiqlo.com`            |

---

## 🧪 QA Status

### ✅ Passed

| Test                                | Result |
|-------------------------------------|:------:|
| All routes (25 routes)              | ✅ 200  |
| Auth guard (unauthenticated → 307)  | ✅      |
| Role-based UI (viewer hidden)       | ✅      |
| Role-based backend guard            | ✅      |
| Modal/dropdown/select interactions  | ✅      |
| File download auth (token/session)  | ✅      |
| File download forbidden (no auth)   | ✅ 403  |
| Invoice share + auto viewed         | ✅      |
| Client portal + deliverable badge   | ✅      |
| Booking submit + success redirect   | ✅      |
| Prompt generator 9Router connection | ✅ 200  |
| SSE response parsing                | ✅      |
| AI Assistant: 15 tools wired        | ✅      |
| AI Assistant: persistence + history | ✅      |
| AI Assistant: action confirm flow   | ✅      |
| Reasoning leak strip                | ✅      |
| Docker → host 9Router network       | ✅      |
| Secret file mount permission        | ✅      |

### ⚠️ Known Gaps

| Item                                | Status     |
|-------------------------------------|:----------:|
| Payment gateway                    | ⚠️ Belum (manual payment/mark paid) |
| Multi-workspace billing             | ⚠️ Phase 2 |
| Pause/resume timer                  | ⚠️ Phase 2 |

---

## 🗺️ Route Map

```
Public:
  GET  /                                — Landing page
  GET  /login                           — Login
  GET  /signup                          — Register
  GET  /forgot-password                 — Reset password
  GET  /booking/[slug]                  — Public booking
  GET  /booking/[slug]?success=1        — Booking confirmed
  GET  /client-portal/[token]           — Client portal
  GET  /invoice/[token]                 — Shared invoice

Protected (require login):
  GET  /app/dashboard                   — Dashboard
  GET  /app/clients                     — Client list
  GET  /app/clients/[clientId]          — Client detail
  GET  /app/projects                    — Project list
  GET  /app/projects/[projectId]        — Project detail
  GET  /app/tasks                       — Kanban board
  GET  /app/files                       — File manager
  GET  /app/time                        — Time tracking
  GET  /app/invoices                    — Invoice list
  GET  /app/invoices/[invoiceId]        — Invoice detail
  GET  /app/calendar                    — Calendar
  GET  /app/prompts                     — Prompt generator
  GET  /app/settings                    — Settings + team
  GET  /onboarding                      — Onboarding flow

API:
  POST /api/auth/[...all]               — Better Auth endpoints
  GET  /api/time/active                 — Active timer status
  GET  /api/files/[fileId]/download     — File download (auth required)
  POST /api/ai/chat                     — AI Assistant chat (auth required)
  GET  /api/ai/chat                     — AI Assistant status
  GET/POST/DELETE /api/ai/conversations — Conversation list/load/delete/create
  POST /api/ai/action                   — Execute confirmed action
  GET  /api/ai/conversations/export?conv=ID — Export conversation as .md (F.3)
```

---

## 🚀 Quick Start (Development)

```bash
cd /root/projects/cubicle
cp .env.example .env
# fill required env variables
npm install
npm run dev        # local dev
npm run build      # production build
docker compose up -d --build  # deploy to Docker
```

---

## 📝 User Guide — Common Flows

### 1. Onboard client
1. Login sebagai owner/member
2. Buat client → `/app/clients` → Add Client
3. Generate portal token → client detail → Portal Token
4. Kirim link portal ke client: `https://cubiqlo.com/client-portal/{token}`

### 2. Track project
1. Buat project → `/app/projects` → New Project (pilih client)
2. Tambah task → `/app/tasks` → buat task di kolom backlog
3. Drag task ke In Progress saat mulai kerja
4. Gunakan timer → start timer di `/app/time`, stop saat selesai

### 3. Kirim invoice
1. Buat invoice → `/app/invoices` → New Invoice (pilih client)
2. Tambah item manual atau import time entries
3. Generate share token → invoice detail → Generate Share Link
4. Kirim link ke client: `https://cubiqlo.com/invoice/{token}`
5. Client buka → status jadi `viewed`
6. Record payment saat client bayar → status jadi `paid`

### 4. Client self-booking
1. Client buka: `https://cubiqlo.com/booking/acme-creative`
2. Pilih tanggal, lihat slot tersedia
3. Isi nama, email, judul → submit
4. Appointment muncul di calendar workspace

### 5. AI content generation
1. `/app/prompts` → pilih template
2. Isi variabel (product, tone, audience, dll)
3. Generate → output dari AI
4. Copy output untuk digunakan

### 6. Upload file untuk client
1. `/app/files` → Upload
2. Pilih Visibility: `Client`
3. Pilih File Type: `Deliverable` (kalau final)
4. File muncul di client portal
5. Client download via portal link

---

## 📋 Sprint History

```
Sprint 1 — Foundation, auth, app shell       ✅
Sprint 2 — Workspace, client, project, task   ✅
Sprint 3 — Comments, files, time tracking     ✅
Sprint 4 — Invoice + client portal            ✅
Sprint 5 — Appointment, prompt, dashboard     ✅
QA & deploy                                   ✅
Post-QA role guard fix                        ✅
File download security fix                    ✅
9Router prompt integration                    ✅
Cloudflare R2 + Resend + cubiqlo.com          ✅
Reply-To email settings                       ✅
Auth rate limiting + monitoring + backups     ✅
Vitest unit tests + Playwright E2E            ✅
Free tier 3-client enforcement                ✅
Landing copy polish (Indo + SaaS English)     ✅
```

---

*Last updated: 23 June 2026 · Coder 2 (Hermes agent)*
