# Cubicle

**Client Operations Hub** — manage client work from request to invoice in one calm workspace.

Built for freelancers, agencies, and small service teams who want to stop juggling spreadsheets, email, and three different SaaS tools to run a client project.

## What it does

- **Clients & projects** — track every active engagement in one place
- **Tasks** — assign, prioritize, drag through statuses
- **Files** — upload, share, control who sees what (internal vs client-visible)
- **Time tracking** — running timer + manual entry, billable/non-billable
- **Invoices** — generate from billable time, send public payment link, mark paid
- **Invoice reminders** — overdue cron, manual reminders, fresh share links, notifications, activity logs
- **Booking page** — public scheduling, clients pick a slot, double-booking prevented
- **Client portal** — share selected projects, timeline events, deliverables/files/invoices with each client via secure token or slug
- **Project timeline** — internal and client-visible activity feed for project/task/file/comment updates
- **Calendar** — see appointments + tasks due
- **Reports & billing** — AR aging, P&L, cash-flow forecast, Pakasir QRIS Solo/Team checkout
- **AI prompt generator** — built-in prompt templates for creative/service work
- **AI Assistant** — chat panel that knows your workspace data, can mark tasks done and draft invoice reminders (with your confirm)

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript strict |
| UI | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| State / Data | TanStack Query (server components) |
| Database | PostgreSQL 16 + Drizzle ORM |
| Auth | Better-Auth (email/password, sessions) |
| File storage | Cloudflare R2 (S3-compatible) |
| Email | Resend |
| PDF | @react-pdf/renderer |
| Container | Docker + Dokploy + Traefik (HTTPS) |

## Quick start (local dev)

### Prerequisites
- Node.js 22+
- Docker + docker compose
- A Cloudflare R2 bucket (or any S3-compatible storage)
- A Resend API key (or any SMTP — fallback to console in dev)
- (Optional) An OpenAI-compatible API endpoint

### 1. Clone and install

```bash
git clone <repo-url> cubicle
cd cubicle
npm install --legacy-peer-deps
```

### 2. Environment

Copy `.env.example` to `.env` and fill in:

```env
# App
APP_URL=http://localhost:3000
NODE_ENV=development

# Database (Dokploy postgres or local docker)
DATABASE_URL=postgresql://postgres:***@localhost:5432/cubicle

# Better-Auth
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000

# Cloudflare R2 (S3-compatible)
R2_ACCOUNT_ID=<your-r2-account-id>
R2_ACCESS_KEY_ID=<key>
R2_SECRET_ACCESS_KEY=<secret>
R2_BUCKET_NAME=cubicle-dev
R2_PUBLIC_ENDPOINT=<public-r2-url>

# Email (Resend)
RESEND_API_KEY=<your-resend-key>
EMAIL_FROM=Cubicle <noreply@your-domain.com>   # optional, defaults to onboarding@resend.dev

# AI (optional, OpenAI-compatible) — used by Prompt Generator + AI Assistant
OPENAI_COMPATIBLE_BASE_URL=https://api.example.com/v1
OPENAI_COMPATIBLE_API_KEY=<key>

# AI Assistant specific (optional, falls back to OPENAI_COMPATIBLE_* above)
AI_API_KEY=***
AI_BASE_URL=http://10.0.1.12:20128/v1
AI_MODEL=tr/MiniMax-M3
```

### 3. Start database

```bash
docker compose up -d cubicle-pg
```

### 4. Run migrations + seed

```bash
npm run db:push        # push schema to db
npm run db:seed        # seed demo workspace + clients + projects
npm run auth:seed      # create demo user accounts with passwords
```

### 5. Start the app

```bash
npm run dev
```

Open <http://localhost:3000>.

### Demo accounts (after seeding)

| Email | Password | Role |
|---|---|---|
| `owner@cubicle.test` | `password123` | owner |
| `member@cubicle.test` | `password123` | member |
| `viewer@cubicle.test` | `password123` | viewer |

Workspace slug: `acme-creative`

## Production deploy

Cubicle is designed to deploy as a single Docker container behind a reverse proxy (Traefik, Caddy, nginx).

### Build the image

```bash
docker build -t cubicle:latest .
```

### Run

```bash
docker run -d \
  --name cubicle \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  -v cubicle-pg-data:/var/lib/postgresql/data \
  cubicle:latest
```

### Dokploy

This repo includes a `docker-compose.yml` for one-click deploy via Dokploy:

- Service: `cubicle` (Next.js on port 3000)
- Service: `cubicle-pg` (Postgres 16 on internal network, port 5432 not exposed)
- Traefik labels auto-configure HTTPS for `cubicle.<your-domain>`
- Both services have CPU + memory limits + log rotation
- Health checks on Postgres
- Restart: `unless-stopped`

See `docs/cubicle_p0_hardening_report.md` for the security audit + hardening checklist.

## Architecture

```
src/
├── app/                          # Next.js App Router
│   ├── (app)/app/                # Authed workspace routes (dashboard, clients, etc.)
│   ├── (app)/onboarding/         # First-time workspace setup
│   ├── api/                      # Route handlers (webhooks, file upload, etc.)
│   ├── booking/[slug]/           # Public booking page (no auth)
│   ├── client-portal/[token]/    # Public client portal (token-based)
│   ├── invoice/[token]/          # Public invoice payment (token-based)
│   ├── login, signup, forgot-password
│   ├── page.tsx                  # Public landing
│   └── layout.tsx                # Root layout + viewport meta
├── components/
│   ├── ui/                       # shadcn primitives
│   ├── app-shell.tsx             # Authed layout shell (sidebar + topbar)
│   ├── app-sidebar.tsx           # Sidebar nav (responsive drawer on mobile)
│   ├── app-topbar.tsx            # Top bar (search, timer, user menu)
│   ├── auth/                     # Auth form components
│   ├── billing/                  # Invoice + payment components
│   ├── booking/                  # Booking flow components
│   ├── calendar/                 # Calendar view
│   ├── files/                    # File upload + viewer
│   ├── prompts/                  # AI prompt generator
│   ├── ai/                       # AI Assistant (chat panel, confirm cards)
│   └── time/                     # Time tracking + timesheet
├── db/
│   ├── index.ts                  # Drizzle client
│   └── schema.ts                 # All 24 table definitions
├── lib/
│   ├── auth.ts                   # Better-Auth server config
│   ├── auth-client.ts            # Better-Auth client config
│   ├── access.ts                 # Role guards (requireUser, assertWorkspace)
│   ├── ai/                       # AI Assistant (9router client, tools, system prompt, conv store)
│   ├── r2.ts                     # Cloudflare R2 helpers
│   ├── tokens.ts                 # Secure random token generation
│   └── utils.ts                  # cn() className merge
└── actions/                      # Server actions per domain
```

### Data flow

1. User logs in via Better-Auth → session cookie set
2. Server actions validate session + workspace membership (`assertWorkspace`)
3. Drizzle ORM queries Postgres (RLS-enforced at the app layer)
4. Mutations trigger `activityLogs` rows for the audit trail
5. File uploads stream to R2 via signed URLs; metadata stored in `files` table with `visibility = 'internal' | 'client'`
6. Public routes (`/booking/[slug]`, `/client-portal/[token]`, `/invoice/[token]`) use unguessable tokens, not session cookies

### Key design decisions

- **Single-workspace MVP** — every user belongs to one workspace. Workspace switcher is a phase-2 feature.
- **Token-based public access** — clients never create accounts. They get a unique URL with a high-entropy token for portal/invoice/booking.
- **App-layer authorization** — `assertWorkspace` in `lib/access.ts` is the single chokepoint for role checks. DB has no RLS; security is enforced in TypeScript.
- **No payments yet** — invoices have a "Mark as paid" button. Real Stripe/payment-gateway integration is phase 2.
- **One Docker container** — app + migrations + (optional) seed. Postgres is a sibling container.

## Operations

### Database backups

**Already wired on this VPS** (see `/root/scripts/cubicle_pg_backup.sh`):

- Daily `pg_dump` of the cubicle database + `pg_dumpall --globals-only` for roles
- `sha256` checksums for tamper detection
- 7 daily + 4 weekly retention (30-day safety net)
- Optional Telegram alert on failure (`--alert-on-fail` flag)
- Cron: `0 19 * * *` (02:00 WIB) on the host
- Restore-test cron: `0 20 * * 0` (Sun 03:00 WIB) — spins up throwaway
  postgres, loads latest dump, asserts ≥10 public tables, prints row
  counts on key tables, cleans up

Manual run:

```bash
bash /root/scripts/cubicle_pg_backup.sh            # local backup
bash /root/scripts/cubicle_pg_restore_test.sh     # verify latest backup
```

### Logs

Both containers are configured with `10m` log rotation × 3 files. Tail with:

```bash
docker logs -f cubicle-cubicle-1
docker logs -f cubicle-pg
```

### Updating

```bash
git pull
docker compose -p cubicle build cubicle
docker compose -p cubicle up -d cubicle
```

### Versioning

The app version shown in the sidebar footer (`Cubiqlo vX.Y.Z`) comes from a
**single source of truth: the `version` field in `package.json`**.

How it flows:

1. `package.json` → `"version": "0.1.21"`
2. `next.config.ts` reads it at build time and exposes it as a public env var:
   ```ts
   import { version } from "./package.json";
   const nextConfig = { env: { NEXT_PUBLIC_APP_VERSION: version } };
   ```
3. `src/components/app-sidebar.tsx` renders it:
   ```tsx
   Cubiqlo v{process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"}
   ```

Because it's baked in at **build time**, the sidebar only updates after a rebuild
(`docker compose build`). It does not change at runtime.

**To cut a new release:**

```bash
# 1. Bump the version (choose one)
npm version patch --no-git-tag-version   # 0.1.21 -> 0.1.22 (bug fixes)
npm version minor --no-git-tag-version   # 0.1.21 -> 0.2.0  (new features)
npm version major --no-git-tag-version   # 0.1.21 -> 1.0.0  (breaking changes)
#   or edit package.json "version" by hand

# 2. Add a matching entry at the top of CHANGELOG.md (format: ## vX.Y.Z — YYYY-MM-DD — summary)

# 3. Rebuild + redeploy so the sidebar picks up the new version
docker compose -p cubicle build cubicle
docker compose -p cubicle up -d --force-recreate cubicle
```

Follow [semver](https://semver.org): `MAJOR.MINOR.PATCH`.

### Migrations

Drizzle migrations live in `drizzle/*.sql`. To add a new one:

```bash
# 1. Edit src/db/schema.ts
# 2. Generate migration
npm run db:generate
# 3. Review the generated SQL
# 4. Apply
npm run db:push
```

## Security

See `docs/cubicle_p0_hardening_report.md` for the full audit.

Highlights:
- ✅ Session-based auth (Better-Auth, secure cookies)
- ✅ App-layer role guards on every mutation
- ✅ Tokens are 32 bytes from `crypto.randomBytes()` (192 bits entropy)
- ✅ Postgres not exposed to public network
- ✅ CSP-friendly (no inline scripts except Next.js required)
- ✅ No known SQL injection vectors (Drizzle parameterizes)
- ⚠️ R2 credentials in env — rotate quarterly
- ⚠️ No rate limiting on auth endpoints (consider Cloudflare Turnstile or upstash/ratelimit)
- ⚠️ No CSRF token beyond what Better-Auth provides (same-origin only)

## Documentation

| Doc | Isi |
|---|---|
| [`docs/USER_GUIDE_CUBICLE.md`](docs/USER_GUIDE_CUBICLE.md) | **Panduan lengkap user** — semua halaman, fitur, alur kerja, status, route map |
| `docs/feature-status.md` | Status DONE / PARTIAL / TODO per fitur |
| `docs/feature.md` | Backlog ide fitur (belum commit sprint) |
| `docs/ai-assistant.md` | Detail Brain / AI tools |
| `docs/cubicle_ops.md` | Operasional deploy |
| `docs/cubicle_env.md` | Environment variables |
| `docs/MANUAL_TEST_CHECKLIST.md` | QA manual |

## Roadmap

See `docs/cubicle_remaining_plan.md` for the full P0/P1/P2 breakdown.

See `docs/feature.md` for backlog feature ideas (not committed to sprint).

Current status:
- Demo MVP: **99%**
- Sellable source/MVP: **97%**
- Production client-ready: **~91%**

## License

Proprietary — internal project. License terms TBD.
