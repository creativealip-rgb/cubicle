# Cubiqlo capacity benchmark

Isolated-environment only. Runner refuses `cubiqlo.com` and `cubiqlo-new-pg`.

## Toolchain

- k6 `v0.54.0`
- OCI `grafana/k6@sha256:1f40432b1cbe7234e977f96c362c9bc550a2d2b583d014dd8669fe40d3e9e755`
- Raw producer: k6 JSON output schema from `--out json=...`, gzip-compressed after run.

## Commands

```bash
CAPACITY_BASE_URL=http://127.0.0.1:3200 \
CAPACITY_DATABASE_URL=postgresql://.../cubiqlo_capacity \
CAPACITY_SESSION_COOKIE='better-auth.session_token=...' \
PROFILE=baseline RUN_ID=capacity-baseline-001 npm run capacity:test

npm run capacity:cleanup -- --run-id capacity-baseline-001
npm run capacity:cleanup -- --run-id capacity-baseline-001 --apply
```

Profiles are machine-readable under `profiles/`. `baseline`, `expected`, and `stress` define exact VUs, duration, route weights, row targets, deterministic seed, role/tenant mix, payload sizes, accepted statuses, and thresholds.

## Evidence

Every run writes under `.capacity-runtime/<run-id>/`:

- dataset manifest
- pre/post invariant JSON
- k6 summary
- `k6-raw.jsonl.gz`
- SHA-256 artifact manifest

Session cookies remain mode `0600` and must never enter committed evidence.

## Workload table

| Route/action | Method | Weight | Type | Role | Tenant | Think time | Status | Payload | SLO |
|---|---:|---:|---|---|---|---|---|---|---|
| Dashboard | GET | 0.20 | read | all | mixed | 2–8s | 200/302 | none | light |
| Clients | GET | 0.15 | read | all | mixed | 2–8s | 200/302 | none | light |
| Projects | GET | 0.15 | read | all | mixed | 2–8s | 200/302 | none | light |
| Tasks | GET | 0.20 | read | all | mixed | 2–8s | 200/302 | none | light |
| Reports | GET | 0.10 | DB-heavy | owner/member | mixed | 2–8s | 200/302 | none | heavy |
| Calendar | GET | 0.10 | read | all | mixed | 2–8s | 200/302 | none | light |
| Invoices | GET | 0.10 | read | all | mixed | 2–8s | 200/302 | none | light |

Upload, exports, AI mock, and real-provider AI are separate scenarios because their resource and cost ceilings differ. Real-provider AI is excluded from automated stress unless explicit budget approval exists.
