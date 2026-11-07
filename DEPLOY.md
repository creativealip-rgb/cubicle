# Cubiqlo — Production Deployment Guide

> Canonical production topology for Alip VPS. Historical plans/evidence under `docs/plans/` and `docs/operations/evidence/` are records, not current runbooks.

## Production topology

- Public app: `https://app.cubiqlo.com`
- Public landing: `https://cubiqlo.com`
- Admin: `https://admin.cubiqlo.com`
- Database: `cubiqlo-new-pg` / database `cubicle`
- Docker network: `dokploy-network`
- Public reverse proxy: **`dokploy-traefik` only** on ports 80/443
- Traefik config: `/etc/dokploy/traefik/dynamic/cubiqlo-new.yml`
- App containers expose port 3000 only inside Docker. Never publish app port 3000 publicly.
- Never start project-local Traefik/nginx/Caddy on 80/443.

Before every deploy, read:

```text
/root/.hermes/shared-workspace/DEPLOYMENT_GUARDRAILS.md
/root/.hermes/shared-workspace/DEPLOY_RULES.md
```

Then run from this repository:

```bash
/root/.hermes/shared-workspace/PRE_DEPLOY_CHECK.sh
```

## Canonical production environment

Secrets stay in ignored `/root/projects/cubicle/.env.production` or the active container environment. Never commit or print them.

```env
NODE_ENV=production
DATABASE_URL=postgresql://...@cubiqlo-new-pg:5432/cubicle
BETTER_AUTH_URL=https://app.cubiqlo.com
NEXT_PUBLIC_APP_URL=https://app.cubiqlo.com
CUBICLE_URL=https://app.cubiqlo.com
RATE_LIMIT_REDIS_URL=redis://cubiqlo-new-redis:6379

# DeepSeek through the internal 9Router OpenAI-compatible gateway.
# ds/deepseek-v4-flash is a 9Router model alias, not a direct api.deepseek.com model ID.
AI_BASE_URL=http://9router:20128/v1
AI_API_KEY=<9router-api-key>
AI_MODEL=ds/deepseek-v4-flash
```

Production currently uses 9Router as transport and DeepSeek as provider/model. Do not replace the 9Router key with a direct DeepSeek key unless architecture is intentionally changed and all AI contracts are re-probed.

## Quality gates

```bash
npm run db:check-migrations
npm run lint
npx tsc --noEmit
npm test
npm run build
```

`npm run db:seed`, `npm run auth:seed`, and `npm run db:generate` do not exist. Do not copy old commands from historical documents.

## Database migrations

Application startup never mutates schema. Apply only checked-in ledger migrations, using the dedicated migration workflow:

```bash
MIGRATION_DATABASE_URL='postgresql://cubiqlo_migrator:...@cubiqlo-new-pg:5432/cubicle' \
DB_CONTAINER=cubiqlo-new-pg \
ALLOW_PRODUCTION_MIGRATION=1 \
npm run db:migrate
```

Take a fresh backup before any production migration.

## Backup and restore verification

Daily local backup is active:

```text
Script:    /root/scripts/cubiqlo_pg_backup.sh
Schedule:  17 2 * * * (02:17 UTC)
Output:    /root/backups/cubiqlo/daily/<UTC timestamp>/
Retention: 14 days
Log:       /var/log/cubiqlo_pg_backup.log
```

Each set contains compressed custom-format DB dump, PostgreSQL globals/roles, manifest, and SHA-256 checksums.

Manual backup and disposable restore test:

```bash
/root/scripts/cubiqlo_pg_backup.sh
/root/scripts/cubiqlo_pg_restore_verify.sh
```

Local backup protects against bad deploys and accidental deletion, not total VPS loss. Encrypted offsite backup remains required for full disaster recovery.

## Blue-green release

1. Confirm clean/synchronized Git state.
2. Run quality gates and backup.
3. Build immutable image:

```bash
SHA=$(git rev-parse --short HEAD)
docker build --no-cache -t "cubiqlo-prod:sha-$SHA" .
```

4. Start a candidate container on `dokploy-network`, port 3000 internal only, with the canonical production env.
5. Verify candidate internally:

```bash
docker exec <candidate> wget -qO- http://127.0.0.1:3000/api/health
```

6. Change exactly the `cubiqlo-new-service` backend URL in `/etc/dokploy/traefik/dynamic/cubiqlo-new.yml`.
7. Verify public health and affected flows.
8. Stop, but do not immediately remove, the previous container. Keep one stopped rollback slot.

The helper `scripts/operations/cubiqlo_blue_green_deploy.sh` supports only the slot names configured at its top. Inspect `docker ps -a` and the active Traefik backend before using it; do not assume historical slot names match runtime.

## Post-deploy verification

```bash
curl -fsS https://app.cubiqlo.com/api/health
curl -LsS -o /dev/null -w '%{http_code} %{url_effective}\n' https://cubiqlo.com/
curl -LsS -o /dev/null -w '%{http_code} %{url_effective}\n' https://app.cubiqlo.com/login
curl -LsS -o /dev/null -w '%{http_code} %{url_effective}\n' https://admin.cubiqlo.com/

ss -tulpn | grep -E ':80 |:443 '
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Networks}}'
```

Expected:

- health body contains `"status":"ok"` and `"db":"ok"`
- only `dokploy-traefik` owns host ports 80/443
- app container has no host port binding
- exact `Host(...)` routers remain intact

After AI changes, verify both authenticated flows:

- Prompt Studio: `/app/prompts`
- Work Assistant: `/app/brain`

A generic provider `200` is not enough; verify structured Prompt Studio output, persisted generation row, streamed assistant whitespace, quota, and visible error handling.

## Rollback

If health or smoke fails:

1. Restore the previous Traefik backend URL or its saved config.
2. Start the previous stopped app container.
3. Confirm `/api/health`, login, and affected workflow.
4. Never roll back database schema blindly.
5. Preserve failure logs and record the rollback decision.

Do not remove the previous image/container until the new release is verified.

## Logs

Resolve the active backend from Traefik before reading logs:

```bash
grep -n 'cubiqlo-new-app-next' /etc/dokploy/traefik/dynamic/cubiqlo-new.yml
docker logs --tail 200 <active-container>
```

Do not use obsolete `cubicle-cubicle-1`; that container is not part of current production.
