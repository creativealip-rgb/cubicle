# Cubicle — Handover Checklist

For transferring ownership of the project to a new operator / buyer.

## What is being delivered

- Source code (this repo)
- Production deployment (currently at `https://cubiqlo.com`)
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
| Custom domain | Any registrar | Yes — production is `cubiqlo.com` |

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
- `PAKASIR_PROJECT` — Pakasir project slug (e.g. `cubiqlo`)
- `PAKASIR_API_KEY` — generate new key in Pakasir dashboard
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
- Production domain: `cubiqlo.com` (Cloudflare DNS, proxied)
- For new domain: register, point A record to new host IP
- Update `APP_URL` and `BETTER_AUTH_URL` env vars
- Update Traefik labels in `docker-compose.yml`
- Update `metadataBase` in `src/app/layout.tsx`
- Update SSLIP_HOSTS list in `src/middleware.ts` if domain changes

### 6. Deployment
- Deploy via Dokploy (recommended) using the included `docker-compose.yml`
- OR any platform that supports Docker (Fly.io, Railway, Render, etc.)

## What the new owner inherits

### Technical debt / status (known)
- 🟢 Production domain live: `https://cubiqlo.com` (Cloudflare + Traefik HTTPS).
- 🟢 `sslip.io` legacy host redirects 301 to `https://cubiqlo.com/`.
- 🟢 Latest `origin/main` deployed on VPS via Docker Compose on 2026-06-27; `cubicle-cubicle-1` and `cubicle-pg` healthy.
- 🟢 Production image rebuilt and running: `cubicle-cubicle:latest` image `a7eaf5cd3a5e`; health endpoint returned `{"status":"ok","db":"ok"}`.
- 🟢 Cloudflare R2 configured (`cubicle-files`) and upload/download smoke test passed.
- 🟢 Resend domain verified for `noreply@cubiqlo.com`; Reply-To setting exists in workspace settings.
- 🟢 Automated validation latest run on 2026-06-27: `npx tsc --noEmit`, `npm run lint`, and `npm run build` passed.
- 🟢 Auth rate limiting active on `/api/auth/*`; Fail2ban recidive jail configured on VPS.
- 🟢 Monitoring/backups active: local monitor cron, Hermes external health check, daily DB backup + weekly restore test.
- 🟢 Free plan enforcement active: Free workspace limited to 3 clients server-side + UI upgrade prompt.
- 🟢 Payment gateway v1 active: Pakasir QRIS checkout for Solo (Rp 49rb) / Team (Rp 99rb) plans; webhook auto-upgrades workspace plan; upgrade-only guard (same-plan & downgrade blocked).
- 🟢 Internal app UI is Indonesian-first for owner/member workspace use, including Dashboard, Clients, Invoices, Proposals, Tasks, Projects, Settings, Time, Files, Reports, and Billing.
- 🟢 Non-IDR currency in internal app avoids `$` symbol; formatter uses ISO prefix (e.g. `USD 1,000.00`) while IDR stays `Rp`.
- 🟢 Client-facing pages kept in English for international clients (Invoice PDF/viewer, Client Portal, public Proposal, Contract, Booking, Intake, Email templates).
- 🟡 No background job queue; cron-style scripts cover monitoring/backups only.
- 🟢 npm audit: 5/6 fixed, 1 accepted (postcss nested in next@16.2.9, build-time only, zero exploit in authored-CSS).

### Operational knowledge
- Demo accounts and seed data are designed to be reset with `npm run db:seed`
- Default workspace is `acme-creative` — change this for production
- The `cPanel` is NOT used (Cubicle is on Dokploy, not cPanel)
- All admin/system access goes through Dokploy + Traefik

### Active maintenance
- None — the project is feature-complete for MVP
- Future work would be: subscription automation (renewal reminders, grace period, receipt email, plan downgrade), multi-workspace billing, mobile app, deeper localization/ICP-specific landing pages

## Pre-handoff checklist

- [ ] All customer data exported / agreed to be discarded
- [ ] Secrets rotated and delivered
- [ ] DNS TTL set to 5 min (or similar) 24h before cutover
- [ ] New owner has Dokploy + DB + R2 + Resend/Cloudflare accounts provisioned
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
