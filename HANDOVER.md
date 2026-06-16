# Cubicle — Handover Checklist

For transferring ownership of the project to a new operator / buyer.

## What is being delivered

- Source code (this repo)
- Production deployment (currently at `https://cubicle.168-144-37-19.sslip.io`)
- Demo workspace seed data
- Documentation set in `docs/`

## What you need to provide

| Resource | Where to get it | Required? |
|---|---|---|
| VPS or container host (Dokploy recommended) | Any cloud | Yes |
| PostgreSQL 16 (managed Neon/Supabase OR self-hosted Docker) | Neon / Supabase / Docker | Yes |
| Cloudflare R2 bucket | Cloudflare dashboard | Yes (file uploads) |
| Resend API key | Resend | Yes (transactional email) |
| OpenAI-compatible API | Any | Optional (AI prompt generator) |
| Custom domain | Any registrar | Optional (currently uses sslip.io) |

## Transfer steps

### 1. Source code transfer
- Push this repo to a new GitHub org / private repo
- Add new owner as collaborator
- New owner clones + verifies `npm run build` succeeds

### 2. Environment secrets transfer
Current secrets in `.env` (encrypted at rest on Dokploy):
- `BETTER_AUTH_SECRET` — generate new one with `openssl rand -base64 32` if you want to invalidate existing sessions
- `DATABASE_URL` — provisioned on the new host
- `R2_*` — generate new R2 access keys
- `RESEND_API_KEY` — generate new key in Resend dashboard
- `OPENAI_*` — generate new API key

Hand these over via 1Password / Bitwarden / secure channel. **Never commit to git.**

### 3. Database transfer
Two options:
- **Dump + restore**: `pg_dump` from current DB → restore on new host
- **Live migration**: point new app to current DB, cut over DNS

### 4. File storage transfer
R2 buckets are not bundled with this repo. Two options:
- **Bucket transfer**: use Cloudflare R2's bucket migration tool
- **Fresh bucket**: new operator sets up new bucket, all old files become inaccessible (acceptable if data is recent)

### 5. DNS / domain transfer
- Current URL is a free sslip.io subdomain
- For production: register a domain, point A record to new host IP
- Update `APP_URL` and `BETTER_AUTH_URL` env vars
- Update Traefik labels in `docker-compose.yml`
- Update `metadataBase` in `src/app/layout.tsx`

### 6. Deployment
- Deploy via Dokploy (recommended) using the included `docker-compose.yml`
- OR any platform that supports Docker (Fly.io, Railway, Render, etc.)

## What the new owner inherits

### Technical debt (known)
- 🟡 25 lint warnings remaining (mostly React Hooks dependency arrays, non-blocking)
- 🟡 R2 file upload E2E not fully tested (placeholders in env)
- 🟡 No automated test suite (manual QA checklist in `docs/cubicle_test_checklist.md`)
- 🟡 Email flows implemented but not all E2E tested
- 🟡 No payment gateway integration (manual "mark as paid" only)
- 🟡 No rate limiting on auth or public endpoints
- 🟡 No background job queue (cron-style booking reminders not implemented)

### Operational knowledge
- Demo accounts and seed data are designed to be reset with `npm run db:seed`
- Default workspace is `acme-creative` — change this for production
- The `cPanel` is NOT used (Cubicle is on Dokploy, not cPanel)
- All admin/system access goes through Dokploy + Traefik

### Active maintenance
- None — the project is feature-complete for MVP
- Future work would be: payment integration, multi-workspace, mobile app, automated tests

## Pre-handoff checklist

- [ ] All customer data exported / agreed to be discarded
- [ ] Secrets rotated and delivered
- [ ] DNS TTL set to 5 min (or similar) 24h before cutover
- [ ] New owner has Dokploy + DB + R2 + Resend accounts provisioned
- [ ] First deploy on new host verified end-to-end
- [ ] Demo accounts (`owner@cubicle.test` etc.) reset with new passwords
- [ ] Source code repo access transferred
- [ ] Domain transferred (if applicable)

## Post-handoff support

TBD — negotiate separately. Options:
- 30-day email support for operational questions
- Paid hourly for further development
- Self-serve with this doc set

## Contact

For questions about this handover:
- Original developer: see git commit history
- Issue tracker: see this repo's issues
