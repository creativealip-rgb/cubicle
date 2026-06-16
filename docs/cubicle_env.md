# Cubicle / Kubikel — Environment Variables

Target stack:
- Next.js App Router
- PostgreSQL 16 (Docker sibling container `cubicle-pg`, not exposed publicly)
- Drizzle ORM
- Better-Auth
- Cloudflare R2
- OpenAI-compatible API
- Resend/nodemailer email

## 1. App

```env
APP_URL=http://localhost:3000
NODE_ENV=development
```

Rules:
- `APP_URL` must be public app origin.
- production value should be Dokploy/Traefik domain or custom domain (currently `https://cubicle.168-144-37-19.sslip.io`).
- never expose server secrets to client components.

## 2. Database

```env
DATABASE_URL=postgresql://USER:***@HOST/DATABASE
```

Rules:
- `DATABASE_URL` used by app runtime. On the VPS this resolves to `cubicle-pg:5432` on the internal Docker network — Postgres is **not** exposed to the public internet.
- No `?sslmode=require` needed for Docker-internal connection; SSL only matters for managed/remote DBs.
- Migrations run via `npm run db:push` / `npm run db:generate` against the same URL.
- Daily `pg_dump` + weekly restore-test cron wired (see `cubicle_remaining_plan.md` P2.5).

## 3. Better-Auth

```env
BETTER_AUTH_SECRET=replace-with-random-secret
BETTER_AUTH_URL=http://localhost:3000
```

Rules:
- `BETTER_AUTH_URL` should equal `APP_URL`.
- production secret must be generated with secure random source.
- session cookie must be secure in production.

Generate local secret:

```bash
openssl rand -base64 32
```

## 4. Cloudflare R2

```env
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET=cubicle-private-files
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_REGION=auto
SIGNED_URL_TTL_SECONDS=300
MAX_UPLOAD_MB=25
```

Rules:
- bucket must be private.
- app stores `storage_key`, never public URL.
- downloads use short-lived signed URLs only.
- signed download URL max 5 minutes.
- MVP max file size 25 MB.
- validate mime type server-side.
- object key format:

```text
workspaces/{workspaceId}/files/{fileId}/{safeFilename}
```

## 5. OpenAI-Compatible API

```env
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_DEFAULT_MODEL=gpt-4o-mini
AI_MONTHLY_CAP_USD=10
```

Rules:
- API key server-side only.
- prompt generator must track `model`, `input_tokens`, `output_tokens`, `cost_usd`.
- enforce monthly cap per workspace.
- allowed model list should be hardcoded or configured server-side.

## 6. Email

Preferred: Resend.

```env
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=Cubicle <no-reply@yourdomain.com>
```

Alternative: SMTP/nodemailer.

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=password
EMAIL_FROM=Cubicle <no-reply@yourdomain.com>
```

MVP email events:
- forgot password
- workspace invite link
- portal comment received
- appointment booked
- invoice viewed

## 7. Rate Limit / Security

```env
RATE_LIMIT_REDIS_URL=
RATE_LIMIT_REDIS_TOKEN=
```

If Redis unavailable in MVP:
- use in-memory limiter for local dev only.
- production should use Upstash Redis or similar.

Routes requiring rate limit:
- login
- signup
- forgot password
- `/client-portal/[token]`
- `/invoice/[token]`
- file download route

## 8. Production Checklist

Before deploy:
- [ ] `APP_URL` production correct
- [ ] `BETTER_AUTH_URL` production correct
- [ ] `BETTER_AUTH_SECRET` random and private
- [ ] DB password rotated (see `cubicle_p0_hardening_report.md`)
- [ ] R2 bucket private
- [ ] R2 credentials limited to bucket access
- [ ] email domain verified (Resend)
- [ ] AI cap configured
- [ ] rate limiter configured (deferred — Upstash or Cloudflare Turnstile recommended)
- [ ] Dokploy env vars set for production
- [ ] no `NEXT_PUBLIC_*` secret leak
