# Cubicle / Cubiqlo — Environment Variables

Target stack:
- Next.js App Router
- PostgreSQL 16 (Docker sibling container `cubicle-pg`, not exposed publicly)
- Drizzle ORM
- Better-Auth
- Cloudflare R2
- Resend email
- Pakasir QRIS billing
- OpenAI-compatible AI endpoint / 9Router

## 1. Required production env

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE
BETTER_AUTH_SECRET=replace-with-random-secret
BETTER_AUTH_URL=https://cubiqlo.com
NEXT_PUBLIC_APP_URL=https://cubiqlo.com
CRON_SECRET=replace-with-random-cron-secret

R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=cubicle-files
R2_PUBLIC_ENDPOINT=https://files.example.com

RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=Cubiqlo <noreply@cubiqlo.com>

PAKASIR_PROJECT=cubiqlo
PAKASIR_API_KEY=your-pakasir-api-key
```

Rules:
- `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` must be same canonical production origin.
- `BETTER_AUTH_SECRET` and `CRON_SECRET` must be random and private.
- Do not put secrets in `NEXT_PUBLIC_*` variables.
- Postgres should stay internal to Docker/Dokploy network unless using managed DB.

Generate secrets:

```bash
openssl rand -base64 32
```

## 2. Optional AI env

```env
AI_API_KEY=your-ai-api-key
AI_BASE_URL=https://your-openai-compatible-endpoint/v1
AI_MODEL=ag/gemini-3-flash
AI_MONTHLY_CAP_USD=5

# Legacy/fallback names used by prompt generator:
OPENAI_API_KEY=
OPENAI_API_BASE=
NINE_ROUTER_API_KEY=
ROUTER_API_KEY=
```

Resolution notes:
- AI Assistant reads Docker secret `/run/secrets/9router_api_key` first, then `AI_API_KEY`.
- Prompt generator supports legacy OpenAI/9Router env names.
- AI is optional for core CRM/invoice/portal features.

## 3. Guarded endpoints

`CRON_SECRET` protects cron/admin health endpoints with:

```http
Authorization: Bearer <CRON_SECRET>
```

Guarded endpoints:
- `/api/cron/invoice-overdue`
- `/api/cron/plan-reminders`
- `/api/cron/expire-plans`
- `/api/notifications/reminders`
- `/api/health/env`

If `CRON_SECRET` is missing in production, these endpoints stay locked.

## 4. Environment audit endpoint

Use after deploy:

```bash
curl -H "Authorization: Bearer ***" https://cubiqlo.com/api/health/env
```

Response includes env names and configured/missing status only. It never returns secret values.

Expected production result:

```json
{
  "ok": true,
  "nodeEnv": "production",
  "missingRequired": []
}
```

## 5. Production checklist

Before launch:
- [ ] `DATABASE_URL` points to production database
- [ ] `BETTER_AUTH_URL` is production origin
- [ ] `NEXT_PUBLIC_APP_URL` is production origin
- [ ] `BETTER_AUTH_SECRET` random and private
- [ ] `CRON_SECRET` random and private
- [ ] R2 bucket private
- [ ] R2 credentials limited to bucket access
- [ ] Resend domain verified
- [ ] `EMAIL_FROM` uses verified sender
- [ ] Pakasir project/API key set
- [ ] AI cap configured if AI enabled
- [ ] no `NEXT_PUBLIC_*` secret leak
- [ ] `/api/health` returns ok
- [ ] `/api/health/env` returns `ok: true` with bearer token
