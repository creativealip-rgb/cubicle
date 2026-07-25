# Deployment Log

## 25 July 2026 — Dependency security patch

- Source revision: `df2b69cd4b22807c31802920f1cd32443b7439ca`
- Release image: `cubicle:sha-df2b69cd4b22807c31802920f1cd32443b7439ca`
- Image ID: `sha256:c41918764e7874db077a50576e6a36fc180823846148a0abe2eed40d9b55f2d0`
- Previous image ID: `sha256:0ab033365cab1302d910e577d606c727ab84b16ed516c254043496b276666842`
- Release manifest: `/root/releases/cubiqlo/2026-07-25T19-33-50Z-df2b69cd4b22.env`
- Scope: upgrade Better Auth to `1.6.22` and PostCSS to `8.5.18`.
- Release gate: locked install, ESLint, TypeScript, 205 tests, Next.js production build, critical dependency audit, immutable Docker build.
- Deploy result: `DEPLOY_OK` through health-gated release script.
- Post-deploy checks: container healthy; app and DB health `ok`; landing and login HTTP 200; anonymous protected API HTTP 401; no recent fatal/network errors; only `dokploy-traefik` owns public ports 80/443.
- Rollback artifact: previous image retained and recorded by deployment script.
- Excluded workspace change: uncommitted `src/app/page.tsx` was not included in this image or commit.

## Related documentation

- `docs/security/dependency-audit-2026-07.md`
- `docs/architecture-security-hardening-plan.md`
- `docs/operations/monitoring-slo.md`
- `docs/operations/backup-recovery-observability.md`
- `docs/operations/staging-contract.md`
