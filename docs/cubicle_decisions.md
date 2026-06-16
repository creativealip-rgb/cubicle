# Cubicle / Kubikel — Design & Operational Decisions

Decisions dibuat sebelum build biar konsisten antar sprint.

## 1. SaaS Pricing Plan (Cubicle sendiri)

MVP free trial dulu, monetisasi phase 2.

| Plan | Harga/bulan | Workspace | Storage | Client | AI cap/bulan | Portal |
|---|---|---|---|---|---|---|
| Starter | Gratis | 1 | 1 GB | 5 | 500 generation | basic |
| Pro | Rp 149rb | 3 | 10 GB | unlimited | 5000 | custom |
| Team | Rp 399rb | 10 | 50 GB | unlimited | 20000 | custom + white-label |

Kode MVP:
- hardcode `plan = 'starter'` di workspace.
- enforce per-plan limit di server actions.
- simpan `workspace.plan` field biar gampang upgrade nanti.

## 2. Workspace Deletion & Data Retention

Aturan:
- `owner` delete workspace → **soft-delete** via `workspace.deletedAt`.
- UI sembunyikan workspace yg `deletedAt IS NOT NULL`.
- Grace period: **30 hari** sebelum hard-delete cascade.
- Recovery: owner bisa restore via `/app/settings/workspace` selama grace period.
- Hard-delete job: cron atau manual trigger by owner.

MVP:
- workspace delete = soft delete dulu.
- hard delete belum implement (phase 2).

## 3. Status Transition Rules

### Invoice

```
draft ──→ sent ──→ viewed ──→ paid
  │         │         │
  └── cancelled        └── overdue (auto by due_date cron)
```

- `draft → cancelled`: owner doang.
- `sent → draft`: tidak boleh.
- `paid → cancelled`: tidak boleh.
- `overdue → paid`: boleh (client telat bayar).
- `sent → overdue`: auto via cron job.

### Time Entry

```
draft ──→ approved ──→ invoiced
  │          │
  └──────────┘ (member can delete draft)
```

- `draft → approved`: owner/member.
- `approved → invoiced`: auto saat invoice import.
- `invoiced → draft`: owner doang (unlock policy).
- member tidak bisa edit/hapus time entry yg `invoiced`.
- member bisa hapus `draft` punya sendiri.

### Project

```
draft → active → on_hold → completed → cancelled
                  ↑            │
                  └────────────┘
```

- semua status bisa bolak-balik kecuali `cancelled`.
- `cancelled` terminal, tidak bisa diubah lagi.

### Task

```
todo → in_progress → review → done
  ↑        ↑          ↑        │
  └────────┴──────────┴────────┘ (bisa mundur)
```

- semua status reversible.
- `done` otomatis jika tidak ada review step.

## 4. Rate Limit Concrete Values

| Endpoint | Limit | Window | Note |
|---|---|---|---|
| Login | 5 | 1 menit per IP | block 15 menit setelah limit |
| Signup | 3 | 1 jam per IP | |
| Forgot password | 3 | 1 jam per IP | |
| Portal token | 30 | 1 menit per token | token hash prefix basis |
| Invoice share | 30 | 1 menit per token | token hash prefix basis |
| File download | 20 | 1 menit per IP | signed URL route |
| Upload | 10 | 1 menit per user | |

MVP:
- in-memory rate limiter (Map dengan TTL).
- no Redis needed.

## 5. Email Template Spec

### Forgot Password

```text
Subject: Reset your Cubicle password
Sender: Cubicle <no-reply@cubicle.app>
Body: Click link to reset. Link expires 1 hour. Ignore if not requested.
```

### Workspace Invite

```text
Subject: {owner_name} invited you to {workspace_name} on Cubicle
Sender: Cubicle <no-reply@cubicle.app>
Body: Join as {role}. Click link. Expires 7 days.
```

### Portal Comment Received

```text
Subject: New comment from {author_name} on {project_name}
Sender: Cubicle <notifications@cubicle.app>
Body: "{comment_preview}..." View in Cubicle.
```

### Appointment Booked

```text
Subject: New appointment: {title} — {date} at {time}
Sender: Cubicle <notifications@cubicle.app>
Body: {attendee_name} booked {date}, {start}-{end}. View in Cubicle.
```

### Invoice Viewed

```text
Subject: Invoice #{number} was viewed
Sender: Cubicle <notifications@cubicle.app>
Body: Client viewed invoice on {date}. View in Cubicle.
```

MVP:
- Resend `react.email` template untuk rendering.
- I18n: MVP English dulu. Indo phase 2.

## 6. Mobile Breakpoint Detail

| Width | Sidebar | Table | Action |
|---|---|---|---|
| ≥ 1024px (lg) | 260px fixed | Table HTML | Full sidebar |
| 768–1023px (md) | Drawer (hamburger) | Table HTML | Sidebar overlay |
| < 768px (sm) | Drawer | Card stack | Fullscreen task drawer |

Sidebar:
- hamburger icon di topbar untuk `md` ke bawah.
- overlay backdrop saat sidebar terbuka.

## 7. Portal Session Behavior

- URL-only token, no cookie/session.
- Token active until: expired OR revoked OR portal disabled.
- User close browser dan buka ulang: tetap bisa karena token di URL valid.
- Rate limit applied per request, bukan per session.

Token lifecycle:
```
generate → active → expired (auto) → useless
                └── revoked (manual) → useless
```

Raw token shown once. User kalau hilang: revoke + regenerate baru.

## 8. File Upload Behavior

- Nama sama di folder/lokasi sama: **auto-suffix**.
- Format: `{name}-{timestamp}.{ext}`
- Contoh: `proposal-20260615-143022.pdf`
- `storage_key` dua-duanya tetap unik.
- Conflict handling client-side: preview sebelum upload kalau detect nama mirip.

## 9. AI Model Allowlist & Pricing

Models diizinkan MVP:

| Model | Provider | Input / 1M tokens | Output / 1M tokens |
|---|---|---|---|
| gpt-4o-mini | OpenAI | $0.15 | $0.60 |
| gpt-4o | OpenAI | $2.50 | $10.00 |
| claude-3.5-haiku | Anthropic | $0.25 | $1.25 |
| claude-3.5-sonnet | Anthropic | $3.00 | $15.00 |

Server-side `ai_models` table:

```sql
model: text
provider: text
input_price_per_1k: numeric
output_price_per_1k: numeric
enabled: boolean
```

Cost formula:

```text
cost_usd = (input_tokens / 1000 * input_price_per_1k) + (output_tokens / 1000 * output_price_per_1k)
```

Hardcode prices di env atau via admin config.

## 10. Date/Time/Timezone Display

- Storage: UTC (semua `timestamptz`).
- Display: browser timezone via `Intl.DateTimeFormat`.
- Booking page: harus jelas UTC + local label.
- Format: `15 Jun 2026, 14:00 WIB (11:00 UTC)`.
- Workspace timezone: `workspace.timezone` field (default `UTC`).

Rules:
- `date` fields (due_date, issue_date) tampilkan tanggal aja tanpa timezone conversion.
- `timestamptz` fields konversi ke browser time.
- Booking page selalu tampil dalam 2 zona.

## 11. Activity Log Retention

- Simpan semua log tanpa cleanup di MVP.
- Table `activity_logs` — no TTL.
- Phase 2: retention policy configurable (90 hari default).
- `portal_access_logs` — same: simpan semua di MVP.

## 12. Per-Page Search/Filter Fields

### Clients

| Field | Type |
|---|---|
| Name | text search |
| Status | dropdown select |
| Tags | multi-select |

### Projects

| Field | Type |
|---|---|
| Name | text search |
| Status | dropdown select |
| Client | dropdown select |

### Tasks

| Field | Type |
|---|---|
| Title | text search |
| Status | dropdown select |
| Priority | dropdown select |
| Assignee | dropdown select |
| Due date | date range |

### Time

| Field | Type |
|---|---|
| Client | dropdown select |
| Project | dropdown select |
| Date | date range |
| User | dropdown select |

### Invoices

| Field | Type |
|---|---|
| Client | dropdown select |
| Status | dropdown select |
| Invoice number | text search |

Semua client-side filter (`Array.filter`) di MVP.
No server query param untuk search dulu.

## 13. Backup & Disaster Recovery

MVP risk level: **low**. Neon punya point-in-time recovery.

Strategy:
- Manual `pg_dump` sebelum major migration.
- Drizzle migration files di Git = schema backup.
- R2 bucket versioning enabled.
- No automated backup job di MVP.

Recovery:
- Neon restore via dashboard.
- Re-run migrations dari Git.
- R2 files tetap aman karena bucket versioning.

## 14. Onboarding Flow Detail

3-step wizard:

### Step 1: Workspace

```
[Logo upload optional]
[Nama workspace] [Slug auto-generated]
[Currency: IDR] [Timezone: Asia/Jakarta]
[Next]
```

### Step 2: Team (optional skip)

```
[Invite member via email]
[Role preset: member]
[Skip]
```

### Step 3: Ready

```
"You're all set! Start by adding your first client."
[Go to Dashboard]
```

Skip rule:
- kalau user masuk via invite link → skip onboarding, langsung join workspace.
- kalau user signup sendiri → full onboarding.

## 15. i18n / Locale Readiness

MVP: **English only**.

Prepare:
- semua UI string di file `src/lib/i18n/en.ts`.
- import dari situ, jangan hardcode string di component.
- phase 2: tambah `id.ts`, ganti pakai `next-intl`.

## 16. API Error Response Format

Semua error response:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Workspace access denied"
  }
}
```

Error codes:
- `UNAUTHORIZED` — belum login.
- `FORBIDDEN` — tidak punya akses.
- `NOT_FOUND` — resource tidak ada/di luar workspace.
- `VALIDATION` — Zod validation gagal.
- `RATE_LIMITED` — too many requests.
- `INTERNAL` — server error.

Server actions: throw error class yg ditangkap Next.js error boundary.

## 17. Toast / Notification Pattern

Gunakan shadcn `sonner` toast.
Rules:
- action sukses → green toast 3 detik.
- action gagal → red toast 5 detik.
- info / neutral → gray toast 3 detik.
- no in-app notification center di MVP.

## 18. Loading Skeleton Pattern

| Component | Skeleton |
|---|---|
| Page load | shadcn `Skeleton` shimmer, 3 baris |
| Table | 5 row skeleton |
| Card KPI | 4 card skeleton |
| Form submit | Button spinner (loading prop) |
| File upload | Progress bar |
| Kanban drag | instant (optimistic) |

Optimistic update:
- task drag di kanban langsung update UI.
- rollback kalau server error.

## 19. Post-Sprint Decisions (16 Jun 2026)

Operational decisions made during P0 deep QA + P1/P2 polish sprint. These are not architectural changes — they document *why* a particular workaround is in place, so a future operator doesn't accidentally undo it.

### 19.1 `postcss <8.5.10` accepted (P0.7)

- `next@16.2.9` pins `postcss@8.4.31` as a nested dep. The XSS vector (unescaped `</style>` in CSS stringification) is build-time only, not runtime.
- pnpm 11 deprecated `pnpm.overrides` for nested transitive deps. Current alternatives (`packageExtensions`, lockfile patches) carry non-trivial risk of breaking Next's CSS pipeline.
- Cubicle's CSS is fully authored (Tailwind v4) with no user-controlled CSS input → exploitability is zero.
- **Re-evaluate when:** Next.js ships a release that drops the nested postcss pin, OR pnpm reintroduces a working override mechanism for nested deps. Full analysis: `docs/npm_audit_risk.md`.

### 19.2 Sign-out HTTP 415 workaround (P0.6 follow-up)

- Better-Auth SDK 1.6.18 returns HTTP 415 when `auth.api.signOut` is called with no body (browser's automatic sign-out fetch sends no Content-Type).
- **Fix:** custom route at `src/app/api/auth/sign-out/route.ts` delegating to `auth.api.signOut({ headers, asResponse: true })`. Better-call `getBody` short-circuits on bodiless requests, skipping the content-type check.
- Don't replace this with the stock SDK endpoint without testing the bodiless path first.

### 19.3 Forgot-password path (P2.2)

- SDK uses `/api/auth/request-password-reset` (returns 200 with `{status:true, message:...}`).
- `/forget-password` is the pre-1.x path and returns 404. **Do not** rename the client page (`/forgot-password`) — the form calls `authClient.requestPasswordReset()` which targets the correct path automatically.
- `/forgot-password` (page) and `/reset-password` (page) both render 200.

### 19.4 Invoice PDF label fix (P2.3)

- Paid and cancelled invoices no longer show "Amount Due" + total — they show "Paid" / "Cancelled" + IDR 0 instead. Confusing for buyers otherwise.
- Patch lives in `src/components/invoices/invoice-pdf.tsx` (commit `1b300a8`).
- Multi-page footer "Page X of Y" only meaningful with >1 page items. Tested with 30 extra line items → 3 pages, footer renders clean.

### 19.5 AI prompt default model (P2.4)

- Working default: `notion/haiku-4.5` via 9router. ~3.8s per call, ~$0.0002.
- Other 9router providers (`openai/*`, `kr/*`, `cx/*`) hit auth or rate-limit issues at the time of testing — **do not** re-add them to the allowlist without re-testing.
- Upstream response is parsed via brace-walking to handle trailing data (some providers append metadata after the JSON object closes).

### 19.6 Demo workspace `billing_name` seed (P2.3 follow-up)

- Workspace `acme-creative` was missing `billing_name`, so PDF header fell back to "Company Name" placeholder.
- Seeded via 1-line SQL: `UPDATE workspaces SET billing_name = 'Acme Creative Studio' WHERE slug = 'acme-creative' AND (billing_name IS NULL OR billing_name = '');`
- For future demo workspaces, set `billing_name` during seed, not after the fact — otherwise invoices render with placeholder until manually patched.

### 19.7 Mobile viewport meta (P1.1 root cause)

- The mobile QA pass 2 found the original `viewport` meta tag was missing on most pages — was the root cause of all squish/clipping symptoms.
- Now standardized: `viewport` meta in root layout, `min-w-0` on flex-1 children of app shell, `flex-col sm:flex-row` on page headers, `w-full sm:w-auto` on action buttons.
- QA script: `scripts/mobile-qa-pass2.cjs` (playwright + google-chrome + Better Auth API login → cookie injection). Reusable for future layout regression.
