# Cubiqlo Staging Contract

## Status

Design and fail-closed preflight are ready. Staging remains inactive until Alip approves environment, DNS, routing, database, storage, and provider changes.

## Contract

Use `.env.staging.example` as key inventory. Every staging deployment must pass:

```bash
scripts/operations/cubiqlo_staging_preflight.sh /path/to/staging.env
```

The preflight requires:

- exact app/auth origin `https://staging.cubiqlo.com`;
- database name `cubicle_staging`;
- staging-isolated R2 bucket;
- Pakasir project/key absent unless contract is extended for a proven sandbox;
- payment mode `disabled` or `sandbox`;
- email mode `sink` and staging/test sender domain;
- explicit `DEPLOY_ENV=staging`.

Any production domain, database, storage bucket, payment project, or sender collision stops deployment before containers or routes are changed.

## Promotion rule

Staging and production must run the same immutable image ID. Promotion changes runtime environment only; source must not be rebuilt between staging acceptance and production deployment.

## Activation prerequisites

1. Alip approves staging activation and resource use.
2. Separate PostgreSQL database and least-privilege role exist.
3. Separate R2 bucket and scoped key exist.
4. Email sink is proven; no real customer recipient is reachable.
5. Pakasir is disabled or a documented sandbox is proven.
6. Auth cookie remains host-only; no `.cubiqlo.com` cookie domain.
7. Access control protects staging.
8. `DEPLOYMENT_GUARDRAILS.md`, `DEPLOY_RULES.md`, and `PRE_DEPLOY_CHECK.sh` pass.
9. Routing uses exact `Host(`staging.cubiqlo.com`)` through `dokploy-traefik`; no project proxy binds 80/443.

## Verification

```bash
scripts/operations/test_staging_preflight.sh
scripts/operations/cubiqlo_staging_preflight.sh .env
```

First command must pass. Second command must reject production `.env` without printing secrets.
