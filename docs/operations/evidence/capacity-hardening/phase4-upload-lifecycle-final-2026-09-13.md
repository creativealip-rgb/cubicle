# Phase 4 Upload Lifecycle Final Evidence — 2026-09-13

## Scope

Environment: isolated PostgreSQL clone plus in-process streamed object/provider mocks. Production DB and production R2 were not mutated. Real-provider 20-way integration remains separately approval-gated by execution contract §8.10.

## Endpoint inventory

Canonical inventory: `docs/operations/upload-endpoint-matrix.json`.

- Workspace file upload: quarantine intent saga, authenticated user/workspace scope, 50 MiB.
- Portal file upload: quarantine intent saga, scoped portal credential, 50 MiB.
- Portal request upload: quarantine intent saga, scoped request/client credential, 50 MiB.
- Expense receipt: authenticated bounded server upload, 10 MiB.
- Personal-site asset: authenticated bounded image upload, 5 MiB.
- Workspace logo: owner-only bounded image upload, 2 MiB.
- Private raw file download: DB authorization plus completed-only streaming.
- Public workspace logo: separate public-image cache namespace.

## Executed checks

### DB state and race suite

`DATABASE_URL=<isolated clone> tsx scripts/operations/test-upload-intent-races.ts`

Exit: 0.

Covered: 8-way idempotent create, mismatched replay denial, double-confirm denial, validation-owner fencing, stale promotion fencing, double-finalize denial, expiry reservation release, failed-promotion retry race, stale-promotion recovery race.

### Stream and object validation

`vitest` focused result: 38/38 pass across six suites.

Covered: exact 5 MiB and 50 MiB streamed PDF, SHA-256, PDF/PNG/JPEG/WebP magic bytes, plain-text NUL rejection, size/checksum/MIME mismatch, exact source VersionId copy, source mutation/TOCTOU rejection, copy failure, final metadata mismatch.

### Capacity

`NODE_ENV=test npm run test:upload-capacity`

```json
{"parallel":20,"bytesPerUpload":52428800,"logicalBytes":1048576000,"chunkBytes":65536,"heapDeltaBytes":666520,"heapCeilingBytes":268435456,"externalRequests":0,"estimatedExternalCostUsd":0}
```

Result: 20 parallel × 50 MiB logical streamed validation, 1 GiB aggregate, heap delta below 256 MiB ceiling, no external request/cost.

### Download and cleanup

Covered by focused contracts and implementation tests:

- pending/non-completed file returns no download;
- exact workspace/client authorization before signing;
- final object metadata binds intent and attempt;
- exact private key, 300-second TTL, attachment disposition, sanitized filename;
- deleted DB row cannot receive a new URL;
- issued URL revocation ceiling is its 300-second TTL; emergency invalidation requires object relocation/key rotation;
- raw body streamed via `transformToWebStream()`;
- canonical quarantine cleanup only, fenced retry, retry ceiling;
- reconciliation scans `quarantine/` and `workspaces/`, detects missing/orphan/mismatch, applies grace and bounded deletion.

## Acceptance verdict

Source/state-machine/isolated-provider acceptance: PASS.
Production R2 20-way mutation: NOT RUN; explicitly separate approval-gated integration, not required to claim source/state-machine completion and not represented as production capacity evidence.
Production release/runtime browser proof: pending release phase.
