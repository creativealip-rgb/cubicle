# Cubicle — Deployment Guide

## Table of contents
1. [Dokploy (recommended)](#1-dokploy-recommended)
2. [Manual Docker](#2-manual-docker)
3. [Other platforms](#3-other-platforms)
4. [Post-deploy verification](#4-post-deploy-verification)
5. [Rollback](#5-rollback)

---

## 1. Dokploy (recommended)

This repo includes a `docker-compose.yml` optimized for Dokploy.

### Steps

1. **Create a new Compose service in Dokploy**
   - Source: Git repository (this repo)
   - Branch: `main`
   - Compose file: `docker-compose.yml`

2. **Set environment variables in Dokploy UI**
   ```
   DATABASE_URL=postgresql://postgres:***@cubicle-pg:5432/cubicle
   BETTER_AUTH_SECRET=<openssl rand -base64 32>
   BETTER_AUTH_URL=https://cubicle.your-domain.com
   APP_URL=https://cubicle.your-domain.com
   NODE_ENV=production

   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET_NAME=cubicle-prod
   R2_PUBLIC_ENDPOINT=https://pub-xxx.r2.dev

   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL=noreply@your-domain.com

   OPENAI_COMPATIBLE_BASE_URL=https://api.example.com/v1
   OPENAI_COMPATIBLE_API_KEY=...
   AI_MONTHLY_CAP_USD=5
   ```

3. **Configure Traefik labels (Dokploy does this automatically if you set the domain)**
   - Host: `cubicle.your-domain.com`
   - HTTPS: auto via Let's Encrypt
   - Port: 3000

4. **Deploy**
   - Click "Deploy" in Dokploy UI
   - First deploy will: build image, run `drizzle-kit push` (via startup), seed demo data
   - Watch logs for "ready on :3000"

5. **Run migrations + seed (one-time, post first deploy)**
   ```bash
   docker exec -it cubicle-cubicle-1 npm run db:push
   docker exec -it cubicle-cubicle-1 npm run db:seed
   docker exec -it cubicle-cubicle-1 npm run auth:seed
   ```

### Resource limits (in `docker-compose.yml`)

| Service | CPU limit | Memory limit |
|---|---|---|
| `cubicle` | 1.5 | 1G |
| `cubicle-pg` | 1.0 | 1G |

Adjust via Dokploy UI if traffic warrants.

### Backup strategy

- **Database**: nightly `pg_dump`, retained 7 days
- **R2 bucket**: Cloudflare handles redundancy; no extra backup needed for MVP
- **Logs**: 10m rotation × 3 files (configured in compose)

---

## 2. Manual Docker

If you don't use Dokploy:

### 1. Provision Postgres

```bash
docker run -d \
  --name cubicle-pg \
  --restart unless-stopped \
  -e POSTGRES_DB=cubicle \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=*** \
  -e POSTGRES_HOST_AUTH_METHOD=scram-sha-256 \
  -v cubicle-pg-data:/var/lib/postgresql/data \
  postgres:16
```

### 2. Build app image

```bash
docker build -t cubicle:latest .
```

### 3. Run app

```bash
docker run -d \
  --name cubicle \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  --link cubicle-pg \
  cubicle:latest
```

### 4. Migrate + seed

```bash
docker exec -it cubicle npm run db:push
docker exec -it cubicle npm run db:seed
docker exec -it cubicle npm run auth:seed
```

### 5. Reverse proxy

Use Caddy / nginx / Traefik in front of `localhost:3000`. See `docker-compose.yml` for Traefik labels.

---

## 3. Other platforms

### Vercel (Next.js native)

Works, but **not recommended for MVP**:
- No built-in Postgres — need Neon/Supabase
- No built-in R2 — need to refactor file upload to use Vercel Blob or external
- Cold starts on serverless can break Better-Auth sessions
- Better-Auth requires a Node.js runtime, not Edge

If you must use Vercel:
- Use Neon for Postgres
- Use Vercel Blob for files (replace R2 calls)
- Configure `runtime = "nodejs"` in `next.config.js`

### Railway / Render / Fly.io

All work with the included `Dockerfile`. Just point at the repo, set env vars, deploy.

---

## 4. Post-deploy verification

Run these from any machine with `curl`:

```bash
# Public landing
curl -sI https://cubicle.your-domain.com/ | head -1
# expect: HTTP/2 200

# Auth flow
curl -sI https://cubicle.your-domain.com/login | head -1
# expect: HTTP/2 200

# Public booking
curl -sI https://cubicle.your-domain.com/booking/acme-creative | head -1
# expect: HTTP/2 200

# Protected app (should redirect to /login)
curl -sI https://cubicle.your-domain.com/app/dashboard
# expect: HTTP/2 307 (or 200 if auth cookie present)
```

Then manually:
1. Open `https://cubicle.your-domain.com/login` in browser
2. Log in as `owner@cubicle.test` / `password123`
3. Verify dashboard shows KPIs (active clients, projects, etc.)
4. Open `/booking/acme-creative` in incognito — verify form is public
5. Create a test invoice → copy public link → open in incognito → mark as paid

---

## 5. Rollback

### Dokploy
- Click "Rollback" in UI → select previous deployment

### Manual Docker
```bash
# Save current container as fallback
docker commit cubicle cubicle:current

# Pull old image
docker pull cubicle:previous-tag

# Stop current
docker stop cubicle
docker rm cubicle

# Start old
docker run -d --name cubicle ... cubicle:previous-tag
```

### Database
- Restore from latest `pg_dump` backup
- ⚠️ Migrations are forward-only; down-migrations are manual

---

## Troubleshooting

### App won't start, "DATABASE_URL not set"
- Check Dokploy env vars are set + container restarted after change
- `docker exec -it cubicle-cubicle-1 env | grep DATABASE`

### "Better-Auth session invalid" loop
- `BETTER_AUTH_URL` doesn't match the actual URL the user is accessing
- Check `metadataBase` in `src/app/layout.tsx` matches production URL

### R2 uploads return 403
- `R2_*` env vars not set or wrong
- Check bucket CORS policy allows PUT from your domain

### Postgres connection refused
- `cubicle-pg` container not running
- Or `DATABASE_URL` points to wrong host (must be `cubicle-pg:5432` inside docker network, not `localhost`)
