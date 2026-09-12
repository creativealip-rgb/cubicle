# Cubiqlo Capacity, Performance & Schema Hardening — Execution Contract

**Tanggal:** 13 September 2026  
**Status:** Revised after review — planning only, execution `NO-GO` until Phase 0 evidence and approvals exist  
**Target host under test:** 4 vCPU, 16 GB RAM, 200 GB NVMe, 16 TB bandwidth  
**Audited production source:** `main@893c84d`  
**Audited production image:** `cubiqlo-prod:sha-893c84d68b860c847591356bba93c6496ab1266d`  
**Canonical workflow:** `docs/dev-production-workflow-plan.md`, `docs/architecture-security-hardening-plan.md`, `AGENTS.md`  
**Environment:** disposable clone and dev first; production approval-gated

## 1. Goal and non-claims

Goal:

1. Remove production DB superuser usage.
2. Establish authoritative PostgreSQL telemetry.
3. Fix proven query/file/export scaling risks without rewrite.
4. Benchmark reproducible authenticated workloads.
5. Publish defensible concurrency limits and upgrade triggers.

**Internal test hypothesis:** initial target is 100 concurrent normal users. This is not an external capacity claim.

Until benchmark and production telemetry calibration finish:

- safe registered users: **not established**;
- safe MAU: **not established**;
- safe concurrent normal users: **not established**;
- safe concurrent heavy operations: **not established**.

Registered users and MAU may only be estimated later from measured production session/request telemetry, not inferred directly from benchmark concurrency.

## 2. Verified baseline and unresolved truth

Read-only audit on 13 September 2026:

```text
Production health: 200, db=ok, sample health latency ≈91 ms
Users: 57
Workspaces: 58
DB size: 23 MB
Production tables: 93
Production indexes: 611
Invalid/unready indexes: 0
Unvalidated foreign keys: 0
RLS policies: 0 (intentional HOLD)
Migration ledger: 52; missing checksum: 0
Runtime DB username: postgres
Runtime DB role: superuser=true, createdb=true, createrole=true
pg_stat_statements: unavailable in audited production runtime
ESLint: pass
TypeScript: pass
Targeted schema/security tests: 13/13 pass
```

Important distinctions:

- `docker-compose.yml` configures service `cubicle-pg`; it is **not** authoritative proof for production container `cubiqlo-new-pg`.
- Production PostgreSQL source-of-truth, recreate mechanism, and role bootstrap path must be discovered and recorded before any change.
- Target role `cubiqlo_app` must not be assumed to exist. Provisioning evidence is mandatory.
- Header source/image values are audit snapshots only. Every execution run must capture current source commit, image digest, schema, migration ledger, and runtime configuration again; stale header values cannot authorize execution.
- Existing restore rehearsal evidence may describe disposable/dev DB. It is not accepted as proof that a current production backup restores successfully.

## 3. Scope

### In scope

- Runtime and migrator DB credential separation.
- Exact production PostgreSQL configuration and query telemetry.
- Expenses query correctness/scalability.
- Reports aggregation and missing-FX semantics.
- Task aggregate tenant scoping and evidence-led optimization.
- Complete upload/download path inventory and lifecycle.
- Complete PDF/XLSX export controls.
- Reproducible authenticated benchmark, soak, recovery, and capacity report.

### Out of scope

- RLS production rollout.
- Managed DB, HA, load balancer, multi-region.
- Product pricing/plan changes.
- UI redesign or unrelated features.
- Production mutation without explicit approval and release gates.

## 4. Phase 0 — Evidence, source-of-truth, backup, rollback

### 4.1 Run ID and artifact contract

Every rehearsal or release creates one evidence directory that becomes append-only after finalization:

```text
docs/operations/evidence/capacity-hardening/<run-id>/
├── environment-manifest.md
├── db-role-snapshot.txt
├── schema-snapshot.txt
├── migration-ledger.txt
├── backup.sha256
├── restore-rehearsal.txt
├── container-runtime.txt
└── rollback-runbook.md
```

`<run-id>` format:

```text
YYYYMMDDTHHMMSSZ-<environment>-<git-sha12>
```

All credentials, tokens, cookies, DSNs, private URLs, and secret values must be redacted. Manifests may retain variable names, usernames where needed for role proof, image IDs, checksums, paths, and non-secret host/service names. Redaction verification must search artifacts for known secret patterns and fail the run if found. A finalized run ID cannot be overwritten; its manifest records SHA-256 checksums for every artifact and is committed to Git or stored in an approved object-locked location.

### 4.2 Artifact contents

**`environment-manifest.md`**

- environment and timestamp;
- source commit, image digest, schema/migration checksum;
- host CPU/RAM/disk/kernel;
- app/DB/Redis container names, images, networks, restart policies, limits;
- sanitized environment variable names only;
- exact authoritative production deployment/config location;
- operator and approval reference.

**`db-role-snapshot.txt`**

- roles, flags, memberships;
- object ownership summary;
- table/sequence/function/schema/database grants;
- default privileges;
- runtime/migrator connection identity proof;
- no passwords or DSNs.

**`schema-snapshot.txt`**

- schema-only dump from identified source DB;
- source DB name/host identity in sanitized header;
- table/index/constraint/policy counts;
- checksum.

**`migration-ledger.txt`**

- ordered migration names/checksums/applied timestamps;
- repo manifest comparison;
- drift verdict.

**`backup.sha256`**

- absolute or canonical backup object path;
- source DB identity;
- creation timestamp and size;
- SHA-256 line generated from actual backup bytes.

**`restore-rehearsal.txt`**

- exact backup used;
- isolated destination DB/container;
- restore command with secrets redacted;
- start/end time and exit code;
- migration/schema/row-count invariants;
- smoke result;
- cleanup result.

**`container-runtime.txt`**

- inspected production app/DB/Redis command, image, mounts, networks, health, restart, resource limits;
- `SHOW` values for PostgreSQL settings;
- sanitized only.

**`rollback-runbook.md`**

- exact immutable rollback image;
- old/new credential secret handles, never values;
- DB config restore path;
- commands appropriate to actual production deployment mechanism;
- verification and escalation sequence;
- rollback trigger owner and approval.

### 4.3 Baseline gates

Before Phase 1:

1. Identify exact production PostgreSQL config and container recreation path.
2. Produce fresh production backup.
3. Restore that exact backup into isolated disposable DB.
4. Verify checksum, schema, ledger, key row counts, constraints, and app-compatible smoke.
5. Record exact rollback image and runtime credential rollback procedure.
6. Preserve existing untracked files; do not include them in commits.

**Acceptance:** all eight artifacts exist, secret scan passes, restore rehearsal passes, source identity is explicit, and production remains unchanged.

## 5. Phase 1 — Runtime app role and dedicated migrator role

### 5.1 Credential architecture

Use distinct secrets:

```text
DATABASE_URL            runtime application role only
MIGRATION_DATABASE_URL  dedicated migrator role only
BACKUP_DATABASE_URL     backup role or approved equivalent
```

Rules:

- App startup fails if `DATABASE_URL` resolves to superuser, owner, migrator, or role with `CREATEDB`/`CREATEROLE`.
- Migration command fails if `MIGRATION_DATABASE_URL` is absent, equals `DATABASE_URL`, or resolves to runtime app role.
- Migration runner verifies `current_user = cubiqlo_migrator`, executes `SET ROLE cubiqlo_owner`, then verifies `current_role = cubiqlo_owner` before applying DDL.
- Migration tools must read `MIGRATION_DATABASE_URL`; `drizzle.config.ts` and runner wiring need explicit separation.
- Secrets remain runtime-only and never enter image layers/artifacts.

### 5.2 Provisioning model

Target roles:

```text
cubiqlo_owner     owns DB/schema objects; NOLOGIN preferred
cubiqlo_migrator  LOGIN; DDL/migration only through approved runner
cubiqlo_app       LOGIN; minimum runtime DML and function execution
cubiqlo_backup    LOGIN; minimum read/backup privileges
```

Provisioning runs as an existing controlled bootstrap/admin role on disposable clone first. Exact SQL must be versioned in an operations script or migration-safe runbook and idempotently validate existing role attributes before changing them. `cubiqlo_migrator` receives membership in `cubiqlo_owner` but does not inherit ownership implicitly; the approved migration runner must execute `SET ROLE cubiqlo_owner` before DDL. After every migration, an ownership audit must prove all managed schema objects are owned by `cubiqlo_owner`, never `cubiqlo_migrator` or `cubiqlo_app`.

### 5.3 Exact ownership and grant matrix

| Scope | owner | migrator | app | backup |
|---|---|---|---|---|
| Database CONNECT | yes | yes | yes | yes |
| Database CREATE | no routine use | only if explicitly required | no | no |
| Schema USAGE | yes | yes | yes | yes |
| Schema CREATE | owner | yes for migration schema/objects | no | no |
| Tables SELECT/INSERT/UPDATE/DELETE | owner | migration verification as needed | only runtime-required tables | SELECT only where backup needs it |
| Sequences USAGE/SELECT/UPDATE | owner | as required | only sequences backing runtime writes | SELECT only if needed |
| Functions EXECUTE | owner | approved functions | explicit allowlist only | none unless backup needs it |
| DDL/ALTER/DROP | owner | migration scope | denied | denied |
| Role management | denied routine use | denied | denied | denied |
| CREATEDB/CREATEROLE/SUPERUSER/BYPASSRLS | no | no | no | no |

Do not accept broad grants as proof of least privilege. Generate an object-by-object required privilege manifest from actual app/migration behavior. Every broad grant must have documented necessity.

### 5.4 Default privileges

Set `ALTER DEFAULT PRIVILEGES` for the object-creating owner/migrator identity so future tables, sequences, and functions receive intended grants. Verify defaults separately for every role that can create objects. Revoke implicit/public privileges before explicit grants where safe.

### 5.5 Revoke matrix

For `cubiqlo_app` and `cubiqlo_backup`, verify denial of:

- schema/object creation;
- `ALTER`, `DROP`, `TRUNCATE` unless a narrowly documented runtime function requires it;
- role/database creation;
- extension management;
- unrestricted function execution;
- access to migration/admin schemas not required at runtime;
- ownership of app objects.

### 5.6 Exact implementation targets

Phase 1 must explicitly reconcile and test:

- `entrypoint.sh`: remove app-credential auto-migration; migration failure must be non-zero/fail-closed.
- `drizzle.config.ts`: read `MIGRATION_DATABASE_URL` only for migration commands.
- `scripts/migrate-ledger.sh`: require dedicated migrator identity, explicit `SET ROLE cubiqlo_owner`, ownership audit, and non-zero failure.
- `DEPLOY.md`: remove instructions that migrate as `postgres` or through runtime app credentials.
- `docker-compose.yml`: keep dev/generic scope explicit; never present it as production source-of-truth.
- `package.json`: expose one canonical migration command and reject ambiguous alternatives.

Bootstrap SQL/runbook must be idempotent and cover roles, `NOLOGIN`/login attributes, `INHERIT` policy, memberships, ownership transfer, grants/revokes, default privileges, and post-migration ownership verification.

### 5.7 Tests

Positive:

- auth/session reads/writes;
- all core CRUD;
- invoice/payment/storage/AI quota flows;
- sequences and approved functions;
- app startup and health.

Negative:

- `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `CREATE DATABASE`, `CREATE ROLE`, `CREATE EXTENSION` fail as app role;
- app cannot modify migration ledger directly unless explicitly required;
- backup role cannot write;
- migrator and app URLs cannot be swapped without fail-fast;
- app cannot grant itself privileges.

### 5.8 Connection rollback

1. Keep prior secret handle available but disabled from normal app config.
2. Change dev/clone first and run full permission regression.
3. Production: fresh backup, record old image/config, update secret, recreate app only.
4. If health/auth/core CRUD fails, restore old credential handle and immutable app image; recreate app.
5. Do not revert successful schema migration by credential swap. Use migration-specific rollback decision.
6. Record timestamps, actor, reason, commands, and post-rollback health in evidence bundle.

**Acceptance:** role provisioning, ownership/grant/default privilege/revoke snapshots pass; runtime app proves `cubiqlo_app` with no elevated flags; migration runner proves dedicated role; negative tests pass; rollback rehearsal passes.

## 6. Phase 2 — Authoritative PostgreSQL production configuration

### 6.1 Discovery first

Production container is `cubiqlo-new-pg`; generic `docker-compose.yml` service `cubicle-pg` is not assumed authoritative.

Record:

- orchestration source and absolute config path;
- service/project name;
- generated/runtime container command;
- image, volume, network, labels, environment key names;
- mounted `postgresql.conf`/`postgresql.auto.conf` or command arguments;
- exact approved recreate/restart command;
- who owns that deployment path.

Never run generic `docker compose` against production until this mapping is proven.

### 6.2 Target settings

Validate on dev/clone first:

```text
shared_preload_libraries includes pg_stat_statements
track_io_timing = on
log_min_duration_statement = 500ms
```

Memory values require calculation from actual DB container limit and host role; do not copy historical 1 GiB tuning blindly onto the new host.

### 6.3 Pre-restart validation

- Render/inspect effective config.
- Run `postgres --check` equivalent supported by image/config shape or launch disposable container with same config and restored DB.
- Confirm extension compatibility and data-volume ownership.
- Confirm free disk and valid backup/restore rehearsal.
- Confirm app reconnect/retry behavior.
- Confirm rollback config and old container image.

### 6.4 Production maintenance sequence

1. Obtain explicit approval artifact.
2. Fresh backup and checksum.
3. Start maintenance observation window.
4. Apply config using authoritative production path.
5. Recreate/restart only required DB service.
6. Verify DB ready, app reconnect, health, auth, and core read/write.
7. Verify settings survive a second controlled recreation on dev; production recreation persistence is checked through config inspection and next approved lifecycle event, not an unnecessary extra prod restart.
8. Query `pg_stat_statements`; verify statements accumulate.

### 6.5 Rollback

Rollback immediately if PostgreSQL fails readiness, recovery errors appear, app cannot reconnect, data checks fail, or sustained lock/latency threshold trips:

1. Restore previous authoritative config.
2. Recreate/restart DB through same production mechanism.
3. Verify recovery and app health.
4. Restore backup only if data corruption is proven and separately approved; config failure alone must not trigger destructive restore.

**Acceptance:** source-of-truth documented; settings active; statement collection works; slow query logging works; app reconnects; settings persist through correct recreation path; evidence bundle updated.

## 7. Phase 3 — Query scalability contracts

### 7.1 Expenses SQL search/count/page

Current source behavior:

- `src/app/(app)/app/expenses/page.tsx:220-246`: fetch up to 100 rows.
- `:248-258`: search in Node.
- `:260-262`: total from `filtered.length`.
- `:264-265`: page via `slice()`.
- Existing tenant predicate and ordering are correct: active `workspaceId`; `date DESC, createdAt DESC, id DESC`.

Required query contract:

1. Use DB-side case-insensitive search via `ILIKE` or an explicitly normalized strategy.
2. Escape literal `%`, `_`, and the chosen escape character; user text must not become wildcard syntax unless product explicitly supports wildcards.
3. Search joined client, project, and category names plus existing expense fields included by current UX. Use `EXISTS` for relational search or explicit deduplication so one expense produces exactly one result. Count and data queries share compiled predicate, bind values, tenant scope, and deduplication semantics.
4. Build one canonical predicate function/SQL fragment used identically by count and data queries.
5. Always include active workspace predicate on expense and safe joins.
6. Data query uses deterministic ordering `date DESC, created_at DESC, id DESC`, `LIMIT`, `OFFSET`.
7. If requested page exceeds total after filters/data changes, clamp or redirect to last valid page; empty result resolves to page 1.
8. Keep page size 10 unless product decision changes it.

Stability tests:

- >100 fixture rows; matching row beyond prior first 100 is found.
- Literal `%`, `_`, backslash, mixed case.
- Match through joined client/project/category.
- Count/data predicates use identical filters and produce correct results on a stable fixture.
- Offset pagination is explicitly eventually consistent: concurrent inserts/deletes may shift rows or make count and page observations differ across requests. No strict snapshot guarantee is claimed. Do not add a long transaction solely for list UI; if strict cross-request stability becomes required, promote keyset pagination separately.
- Tenant-negative fixture.
- `EXPLAIN (ANALYZE, BUFFERS)` on >100 fixture before/after; preserve plans in evidence.

### 7.2 Reports and explicit FX semantics

Current issue:

- `reports/page.tsx:169-204`: payment/expense rows loaded into Node.
- `:212-263`: sums/groups in Node.
- `:274-290`: repeated `groups.findIndex()`.

Contract:

- Converted aggregate includes **only rows with valid FX** to base currency.
- Missing-FX output includes currency, missing row count, and original-currency total for each missing currency.
- `reportStatus = partial` when any missing FX exists; otherwise `complete`.
- Every KPI/aggregate dependent on conversion displays a visible partial-data warning when status is partial.
- Original nominal values remain available by currency; they are never silently treated as zero or base currency.
- Export remains available but includes warning metadata/sheet containing missing currencies, counts, original totals, base currency, FX snapshot/time, and `partial` status.
- Sorting/ranking excludes unconverted amounts from base-currency ranks while warning remains visible.
- SQL aggregation must preserve decimal precision; rounding happens only at established presentation boundaries.

Canonical report DTO shared by page and export contains `status`, `baseCurrency`, `fxSnapshot`, `convertedTotals`, `originalTotalsByCurrency`, `missingFx`, and `rankingSet`. A valid FX rate is finite and positive, uses base-currency identity `1`, an explicit direct/inverse rule, source/version, effective timestamp selected in workspace timezone, and fixed decimal precision; stale-rate policy is declared. Page and export use the same snapshot and rounding boundary. SQL computes converted and missing-FX aggregates separately with no inner join that silently drops missing rows.

Parity fixtures:

1. IDR only.
2. USD with valid FX.
3. Missing FX.
4. Rounding boundaries.
5. Start/end date and application timezone boundaries.
6. Empty buckets.
7. Duplicate dates.
8. Large custom range.
9. Mixed current/comparison periods.
10. Export parity with page result.

Optimization:

- Bound custom date range explicitly after product review.
- Aggregate by period/currency/client/category in SQL.
- Remove repeated bucket `findIndex` with deterministic SQL bucket or map lookup.
- Do not sum mixed currencies without explicit FX.

### 7.3 Task time aggregates

Current correlated aggregates must be scoped by both:

```text
time_entries.task_id = tasks.id
time_entries.workspace_id = activeWorkspaceId
```

Requirements:

- Preserve task query active workspace predicate.
- Capture `EXPLAIN (ANALYZE, BUFFERS)` before/after on expected/stress fixtures.
- Optimize only if query plan or `pg_stat_statements` proves bottleneck.
- Check all 611 existing indexes for semantic duplication before adding any index.
- Any new composite index needs workload evidence, write-cost note, and rollback SQL.

**Phase acceptance:** correctness fixtures pass; cross-tenant negative tests pass; explain artifacts recorded; no speculative index added.

## 8. Phase 4 — Complete file lifecycle contract

### 8.1 Endpoint inventory

Every path must be classified and tested independently:

| Path | Current concern | Target decision |
|---|---|---|
| `src/app/api/files/upload/route.ts` | full `arrayBuffer()` | direct intent upload |
| `src/app/api/client-portal/files/upload/route.ts` | public-token path, full buffer | scoped direct intent upload |
| `src/app/api/client-portal/requests/upload/route.ts` | public-token path, full buffer | scoped direct intent upload |
| `src/app/api/expenses/receipt/route.ts` | full buffer | direct/quarantine or bounded server upload |
| `src/app/api/site/upload/route.ts` | full buffer | bounded image path or direct/quarantine |
| `src/app/api/workspace/logo/route.ts` | full buffer | bounded image path or direct/quarantine |
| `src/app/api/files/raw/[...key]/route.ts` | full download buffer | authorized signed URL or stream |
| `src/app/api/public/workspace-logo/[workspaceId]/route.ts` | full download buffer | public-image cache/stream policy |
| `src/lib/r2.ts` callers | helper may full-buffer | caller inventory and streaming-safe API |

Completion for one endpoint does not imply completion for others. Inventory must include caller, auth mode, max size, MIME classes, visibility, quota path, storage namespace, and cleanup path.

### 8.2 Upload intent record

Persist:

- ID;
- workspace ID;
- actor identity: user ID or scoped client/public credential identity;
- expected server-generated object key;
- expected MIME;
- max and expected bytes where known;
- expected checksum using supported object metadata/checksum;
- expiry;
- state;
- idempotency key scoped to actor/workspace/destination;
- final resource destination/type;
- created/updated/uploaded/completed timestamps;
- failure and cleanup retry metadata.

States:

```text
reserved
uploaded
validating
promoting
promotion_failed
completed
aborted
expired
quarantined
failed_cleanup
```

Allowed transitions are explicit and compare-and-set/row-locked. `promotion_failed` may retry only through a bounded reconciliation worker. Terminal states cannot return to active states except cleanup/promotion retry metadata; retry never exposes the object.

### 8.3 Transition and lease contract

Every transition is versioned in a table with: `from`, `to`, actor, lock/CAS predicate, lease requirement, retry cap, side effect, failure state, and cleanup action. Canonical rules:

- Intent creation reserves quota and generates a unique key from a UUID intent ID; a unique DB constraint prevents collisions. Idempotent creation returns the same intent only for the same actor, workspace, destination, and idempotency key.
- `reserved → uploaded`: client/provider confirmation only; object remains private.
- `uploaded → validating`: finalize worker claims a validation lease.
- `validating → promoting`: Tx A assigns `promotion_attempt_id`, `promotion_lease_owner`, and `promotion_lease_expires_at`.
- `promoting → completed`: only Tx B with matching current attempt/fencing token may commit.
- `promoting → promotion_failed`: bounded failure path; retries receive a new fencing token.
- `quarantined` is terminal and non-downloadable pending separately approved scanner/manual disposition; it cannot promote without a new validated transition.
- `aborted` and `expired` are terminal. `failed_cleanup` records cleanup state and never grants visibility.
- Stale workers cannot renew, complete, release quota, or delete objects after lease ownership changes.

Quota reservation uses row-locked CAS transitions `active → consumed` or `active → released`. Tx A and Tx B lock the reservation row. Expiry may release only an unclaimed reservation with no live validation/promotion lease. Double-finalize and finalize-versus-expiry races are mandatory tests.

### 8.4 Quarantine policy

Choose quarantine-prefix validation for untrusted files:

1. Presigned URL only permits exact server-generated key under private quarantine prefix.
2. Object is not publicly routable/downloadable.
3. Finalize locks reservation and rejects expired/consumed/invalid transition.
4. `HEAD` verifies exact key, size, and content type. Checksum proof must be provider-validated or server-derived; client-declared custom metadata alone is never authoritative.
5. Server streams object bytes to compute SHA-256 when provider-validated checksum is unavailable, while reading required signature bytes for magic-byte validation. File classes that cannot be safely validated are rejected or remain quarantined pending an approved scanner.
6. Reservation quota already exists from intent creation. A DB transaction creates the final file row with `pending` visibility and records `promoting`; it does not consume quota yet and does not claim atomicity with R2.
7. Copy object to final private namespace, verify final object, then commit DB row and intent as `completed` and consume quota. Only `completed` rows are downloadable.
8. Delete quarantine object after completion. If promotion fails, transition to `promotion_failed`; if DB finalization or cleanup fails, retain durable retry metadata.
9. Reconciliation repairs bounded `pending`/`promotion_failed` states and detects final-key orphans, missing objects, and metadata/checksum mismatches.
10. Cleanup failure transitions to `failed_cleanup` and enters retry queue.
11. Expiry job marks stale intents and deletes quarantine objects idempotently.

This is an explicit DB/R2 saga. No step may describe DB and object-store mutation as one atomic transaction.

Direct upload without quarantine is prohibited for untrusted file classes requiring magic-byte validation.

### 8.5 Exact saga boundaries

**Tx A — no R2 I/O inside transaction**

1. Lock intent, reservation, and destination identity rows in canonical order.
2. Verify actor/workspace/destination, state, expiry, idempotency, and active reservation.
3. Create or reuse one non-visible `pending` file row.
4. CAS `validating → promoting`; assign fresh attempt/fencing token and lease.
5. Commit.

**R2 promotion — no DB transaction held**

1. Stream/validate immutable quarantine object.
2. Copy exact object version to final private key with metadata containing intent ID and attempt token.
3. Verify final key, size, SHA-256, content type, and version/ETag where supported.

**Tx B**

1. Lock intent, reservation, and file in same canonical order.
2. Verify `state=promoting`, live lease, and exact attempt/fencing token.
3. CAS reservation `active → consumed`.
4. CAS file `pending → completed` and intent `promoting → completed`.
5. Commit.

If R2 promotion succeeds but Tx B fails, final object remains non-routable by DB state. Reconciliation retries Tx B first. Final object deletion is allowed only after a grace period and proof that no active saga/file pointer exists. No R2 operation occurs inside Tx A or Tx B.

### 8.6 Finalize invariants

- Lock reservation.
- Check actor/workspace/destination scope again.
- Reject expired/completed/aborted/invalid state.
- Verify exact object key, size, content type, and provider-validated or server-derived checksum; reject client-declared checksum metadata as sole proof.
- Validate file signature/type.
- Require an existing active quota reservation; persist DB file pointer as non-visible `pending`; promote and verify R2 object; then transition pointer and intent to `completed` and consume that reservation in one DB transaction.
- Idempotent replay returns same completed resource, not duplicate row/quota charge.
- DB or R2 failure leaves a recoverable saga state and durable reconciliation/cleanup record.
- Reconciliation detects stuck pending rows, promotion failures, missing referenced objects, and orphan final objects.
- Object remains inaccessible until completed.

### 8.7 Checksum and object immutability

- Canonical checksum is SHA-256 encoded as lowercase hexadecimal.
- Client-declared checksum/MIME is hint only. Trusted expected MIME class/max bytes come from server domain policy.
- Use provider-validated SHA-256 when supported; otherwise stream object server-side and derive SHA-256. Multipart ETag is never treated as content checksum.
- Bind validation to exact quarantine key, object version/ETag, intent ID, and attempt token. Copy from that immutable version where provider supports versioning/preconditions.
- Verify final object after copy. A changed source between HEAD/stream/copy fails promotion and is tested as TOCTOU mutation.

### 8.8 Signed download authorization

Before issuing URL:

- authenticate/resolve public credential;
- authorize exact DB file row and active workspace/client/public lifecycle;
- verify file is `completed`, final-object integrity is valid, and file is not deleted/revoked/quarantined/promotion-failed; quarantine cleanup failure alone does not block a verified completed final object;
- sign exact private object key only;
- TTL short and documented;
- safe `Content-Disposition` and sanitized filename;
- no list/prefix permission;
- URL cannot be renewed after revoke/delete; a concurrent revoke after authorization but before issuance may leave an issued URL valid only until TTL by explicit consistency contract, and this race is audit-logged/tested;
- already issued URL remains valid only until TTL; emergency revocation requires key rotation/object relocation policy;
- public site image namespace and cache policy stay separate from private file namespace.

### 8.9 Reconciliation contract

Executable reconciliation fails closed against a versioned expected-check ledger. It records expected and executed check IDs/counts, scanned workspace/run scope, intent/file/object counts, stuck states, missing references, orphan final/quarantine objects, metadata/checksum mismatches, lease/quota violations, retries, and deletion decisions. Missing/unknown mandatory checks or partial scan scope fail the gate. Orphan deletion requires intent/attempt metadata, grace period, and proof no active saga exists.

### 8.10 Tests

- 5 MB and max-size upload.
- 20 parallel max-size uploads without OOM, only against isolated R2 bucket/mock with unique run namespace, timeout, cleanup verification, storage/cost ceiling, and production-host guard. Real-provider integration uses separately approved bounded concurrency.
- expired/replayed intent.
- checksum/MIME/magic-byte mismatch.
- cross-workspace/cross-client finalize.
- DB commit failure and cleanup retry.
- deleted/revoked file cannot receive new URL.
- URL TTL and exact key.
- private object unavailable before finalize.

## 9. Phase 5 — Export inventory and protection

### 9.1 Required endpoint matrix

Create versioned inventory before implementation:

```text
endpoint | format | auth | tenant scope | source range | max rows |
rate limit | user concurrency | workspace concurrency | instance concurrency |
buffer/stream model | timeout | disconnect behavior | response code
```

Must cover at least:

- Expense XLSX.
- Report XLSX.
- Client-list XLSX.
- Client-detail XLSX.
- Invoice PDF.
- Client PDF.
- Proposal PDF.
- Contract PDF.
- Time/timesheet/report PDF endpoints after complete route search.

No endpoint is declared safe by analogy; inspect each query and rendering path.

### 9.2 Guard contract

- Distributed request-rate limiter uses existing Redis-backed limiter.
- Key separately by user and workspace; public-token exports additionally key by token/resource and IP where appropriate.
- Exact burst/window values are selected after single-export cost measurement and recorded in matrix.
- Heavy-export concurrency semaphore is separate from request-rate limiting. One reviewed Redis Lua script atomically acquires user, workspace, and instance dimensions all-or-none; no partial slot can remain when one dimension fails.
- Acquire returns a unique fencing/lease token. Renew and release use token compare-and-update/delete; expired holder cannot release a replacement lease. Keys, TTL, renewal interval, clock assumptions, and maximum counts are versioned in the endpoint matrix.
- Initial hypothesis for measurement—not final hardcoded policy:
  - max 1 heavy export/user;
  - max 2 heavy exports/workspace;
  - max N/app instance derived from memory/CPU test.
- Request abort signal propagates into supported render/query work. A hard-timeout watchdog and `finally` release execute on success, failure, timeout, and disconnect. Lease expiry plus reconciliation covers process death; acceptance contains no `where feasible` exception.
- Limit response is `429` for user/workspace rate/concurrency pressure or `503` for instance capacity; include clear JSON/message and `Retry-After`.
- Redis failure behavior: fail-closed for heavy export admission with explicit `503`, because fail-open can OOM app. Health/alert records failure.
- Tenant authorization executes before expensive data load/render.
- Row/range limits are explicit and enforced server-side.

### 9.3 Worker threshold

Keep synchronous export only if all endpoint-specific concurrency SLOs pass. Promote to background worker when measured memory/CPU/time exceeds documented threshold. Do not add worker preemptively.

**Acceptance:** complete matrix exists; all heavy endpoints enforce auth, tenant, range/row limits, rate and concurrency contract; slots release on every termination path; 5 parallel heavy exports do not break normal CRUD SLO or trigger OOM.

## 10. Phase 6 — Reproducible benchmark contract

### 10.1 Toolchain

- Tool: **k6**, version pinned in repo script/container definition before execution.
- Script root: `scripts/performance/capacity-hardening/`.
- Config and scenarios committed; raw results excluded only if huge, with checksummed artifact references.
- No ad-hoc curl loop counts as capacity evidence.

Required files:

```text
scripts/performance/capacity-hardening/
├── README.md
├── k6-version.txt
├── workload.js
├── auth-bootstrap.ts
├── seed.ts
├── cleanup.ts
├── invariants.ts
└── profiles/
    ├── baseline.json
    ├── expected.json
    └── stress.json
```

### 10.2 Runtime split and pin enforcement

- Pin an exact k6 version and OCI image digest. Preflight runs `k6 version`, verifies expected version/digest, and exits non-zero on mismatch.
- `scripts/performance/capacity-hardening/node/` contains Node scripts (`.mjs` preferred; TypeScript only with an already-installed, pinned runner/build step).
- `scripts/performance/capacity-hardening/k6/` contains k6-compatible JavaScript only. No raw Node TypeScript is passed to k6.
- Runner invokes explicit `k6 run`, threshold config, summary export, structured output producer, and compression/checksum step. `k6-raw.jsonl.gz` must name its producer/schema; it is not assumed to be native output.

### 10.3 Dataset profiles

Each profile is machine-readable and contains numeric values—not a prose checklist—for VU/stages, arrival/VU model, route weights summing to 1, request rate target, timeout/retry policy, payload bytes, accepted statuses, tags, and per-route thresholds. It also defines:

- exact row count per table;
- small/medium/large tenant skew;
- owner/member/viewer distribution;
- entity status distribution;
- date/timezone distribution;
- currency and FX availability/missing distribution;
- active/archive/delete/revoked distribution;
- file metadata count and file-size distribution;
- total expected DB size;
- deterministic random seed;
- schema and migration checksums;
- seed, verify, rerun-idempotency, dry-run cleanup, and cleanup commands;
- exact run namespace, fixture ID mapping, synthetic user/tenant mapping, expected row-count deltas, and post-cleanup zero-leak assertions;
- exact 5 MiB (`5 * 1024 * 1024`) and 50 MiB (`50 * 1024 * 1024`) fixture generation, MIME, SHA-256, namespace, mock/provider mode, timeout, and storage/cost ceiling.

Profiles:

- `baseline`: functional sanity and script validation.
- `expected`: forecast launch workload.
- `stress`: intentionally skewed large tenants and historical rows.

Seed is idempotent or uses a unique run namespace. Cleanup must refuse production DB/host and delete only that run namespace.

### 10.4 Auth/session model

- Create synthetic accounts only.
- Capacity mode uses a committed isolated-environment session bootstrap, selected before implementation: create synthetic users through supported server-side test fixture path, then acquire sessions through the real login/auth endpoint. Login capacity is measured separately. Each VU receives one deterministic synthetic identity matching profile role/tenant mapping.
- Record session lifetime, cookie scope, refresh behavior, and CSRF requirements.
- Role mix and tenant mix follow profile.
- Secrets enter runners only through approved runtime secret injection; preflight rejects production credentials, production host/database markers, and non-synthetic identities. Never store session cookies or credentials in evidence; identifiers use a documented salted hash/truncation format and evidence stores counts only.
- Include expired session and refresh cases outside steady-state capacity measurement.

### 10.5 Workload definition

Before run, version a weighted route/action table containing:

```text
route/action | HTTP method | weight | read/write | role | tenant size |
think-time distribution | expected status | payload profile | SLO class
```

Minimum scenarios:

1. Normal mixed authenticated: dashboard, client/project/task lists/details, task update, timer, invoice read/write, calendar, portal read.
2. DB-heavy: report periods, search, large-tenant lists.
3. Upload 5 MB.
4. Upload 50 MB.
5. XLSX exports by endpoint class.
6. PDF exports by endpoint class.
7. AI mocked.
8. AI real provider.

Weights must be reviewed against observed production telemetry when available. Initial weights are hypotheses and must be labeled.

### 10.6 Stage parameters

Each committed run config explicitly defines:

- warm-up;
- ramp steps;
- steady-state duration per stage;
- cooldown;
- seeded think-time distribution;
- session length;
- read/write ratio;
- route weights;
- role and tenant distribution;
- minimum samples per route/SLO class;
- soak duration.

Initial candidate, subject to pre-run review:

```text
Warm-up: 5m
Ramp: 0→25 over 5m; 25→50 over 5m; 50→100 over 10m;
      then 150 and 200 only if prior stage passes
Steady state: 30m per stage
Cooldown: 5m
Think time: deterministic seeded distribution between 2s and 8s
Soak: highest passing normal-mixed stage for 2h
```

Do not run higher stage after a failed acceptance stage until issue triaged.

### 10.7 AI split

**App-capacity mode**

- Mock/stub OpenAI-compatible provider.
- Controlled latency, response size, SSE cadence, tool rounds, success/error mix.
- No real provider cost.
- Measures Cubiqlo SSE, connections, tool DB queries, persistence, and retry behavior.

**Provider-integration mode**

- Real DeepSeek provider.
- Small bounded concurrency.
- Explicit request/token/USD ceiling and abort before budget exceeded.
- Measures provider latency, timeout, rate limit, retry, and end-to-end behavior.
- Report separately; never use it alone as app capacity.

### 10.8 Metrics and raw artifacts

Per run write:

```text
docs/operations/evidence/capacity-hardening/<run-id>/benchmark/
├── config.json
├── dataset-manifest.json
├── k6-summary.json
├── k6-raw.jsonl.gz
├── route-thresholds.json
├── host-metrics.csv
├── container-metrics.csv
├── postgres-settings.txt
├── pg-stat-statements-before.txt
├── pg-stat-statements-after.txt
├── slow-query.log
├── invariants-before.json
├── invariants-after.json
├── recovery.txt
└── report.md
```

Credentials/session material is prohibited. Large raw files may live in approved object storage, but local manifest must contain exact URI, byte size, SHA-256, retention, and access classification.

Metrics contract:

- sample host/container/DB metrics every 5 seconds; aggregate across full steady-state and report any threshold breach sustained for 60 seconds;
- record exact metric source and denominator for every percentage; DB connection utilization uses configured pool maximum and PostgreSQL `max_connections` as separately labeled denominators;
- capture DB pool acquisition wait and event-loop lag from versioned app instrumentation;
- classify slow queries by normalized fingerprint; the pre-run config defines repetition threshold `N`, and a slow-query finding requires at least `N` calls with mean or p95 `>=500ms`; `N` cannot change after results are seen.

Collect:

- request throughput/error/p50/p95/p99 by route;
- CPU/load/RAM/swap/disk/network/event-loop lag;
- container restarts/OOM;
- DB connections/locks/deadlocks/cache hit/temp files/top statements;
- Redis health/semaphore state;
- R2/mock/provider latency;
- AI tokens/cost ceiling in real-provider mode.

## 11. Acceptance, safety aborts, invariants, and recovery

### 11.1 Acceptance thresholds

A stage fails if, over steady-state:

- HTTP unexpected error rate `>=1%`;
- p95 CRUD/light page `>=1.5s`;
- p95 dashboard `>=2.5s`;
- p95 normal report `>=4s`;
- CPU average `>=70%` or sustained saturation/queue;
- RAM `>=80%` or swap thrashing;
- DB connections `>=70%` of configured maximum;
- endpoint-specific export/upload thresholds fail;
- any integrity/tenant invariant fails.

Thresholds may be revised only before a run with written reason, never after seeing results.

### 11.2 Machine-enforced threshold semantics

`route-thresholds.json` has a validated schema mapping normalized route/action and SLO class to allowed statuses, timeout classification, minimum samples, p95/p99, and error threshold. Warm-up samples are excluded by exact timestamp boundaries; failed/timeout requests remain error samples. Dropped iterations, unknown route tags, missing metric intervals, or unmet minimum samples fail the stage. Percentiles come from pinned k6 summary semantics and are reported per request and separately per business transaction. Collector schemas, clock synchronization, source commands, and allowed missing-sample count are versioned.

### 11.3 Safety abort thresholds

Abort immediately on:

- cross-tenant disclosure/mutation;
- financial or storage quota integrity failure;
- DB corruption/recovery mode;
- OOM or container restart;
- disk exhaustion risk;
- provider budget ceiling reached.

Abort when sustained for 60 seconds unless immediate condition above:

- unexpected error rate `>=5%`;
- DB connections `>=90%`;
- p95 light requests `>5s`;
- lock storm/deadlock pattern;
- CPU saturation or memory pressure threatening host stability.

Acceptance failure means stage is not passing; safety abort means stop workload to protect environment.

A committed watchdog samples every 5 seconds, evaluates immediate and sustained abort rules, sends graceful stop then hard kill after timeout, writes machine-readable abort reason/exit code, preserves partial artifacts, runs recovery/invariants/cleanup, and exits non-zero. Lock-storm/deadlock abort queries and numeric count/window thresholds are fixed before run.

### 11.4 Pre/post data invariants

Version `invariants.ts` and record before/after:

- tenant row ownership and orphan count;
- FK/unique/check violations;
- invoice/payment totals and statuses;
- timer/time-entry uniqueness and lifecycle;
- AI quota reservations/counts;
- storage reserved/used/object pointer reconciliation;
- upload intent state counts and stale reservations;
- export semaphore leases;
- migration ledger/checksums;
- expected synthetic mutation deltas only.

Any unexpected delta fails run.

Expected synthetic deltas are machine-readable per scenario. Allowed timestamp drift, sequence gaps, audit/session/cache rows, asynchronous cleanup windows, and provider retries are explicit; unknown deltas fail closed.

### 11.5 Recovery, repetition, and soak

Before load, record a 15-minute idle and baseline-workload envelope at 5-second sampling. Recovery passes only when required consecutive samples stay within the predeclared baseline tolerance for latency, CPU, RAM, connections, queues, and locks. Tolerance and sample count are fixed before run.

Every candidate passing stage runs at least twice under documented warm/cold-cache policy. Report variance and uncertainty; disagreement requires another run and no capacity claim.

After highest passing stage:

- run 2-hour normal-mixed soak with its own error budget, drift limits, zero restart/OOM allowance, disk-growth ceiling, queue/lease ceiling, and periodic checkpoint cadence;
- stop load and observe 15-minute recovery;
- verify latency, CPU, RAM, connections, queues, locks, cleanup jobs return to baseline envelope;
- rerun invariants;
- verify no leaked export slot/upload reservation;
- verify no restart/OOM/disk growth anomaly;
- repeat recovery after any safety abort;
- run mixed contention at bounded levels: normal traffic plus upload, export, and mocked AI, proving normal CRUD SLO remains within threshold.

## 12. Phase 7 — Capacity decision

Report each workload independently:

| Workload | Highest sustained passing concurrency | Steady duration | Soak | Bottleneck | Verdict |
|---|---:|---:|---:|---|---|
| Normal mixed | N | duration | pass/fail | evidence | pass/fail |
| DB-heavy | N | duration | n/a or duration | evidence | pass/fail |
| Upload 5 MB | N | duration | n/a | evidence | pass/fail |
| Upload 50 MB | N | duration | n/a | evidence | pass/fail |
| XLSX export | N | duration | n/a | evidence | pass/fail |
| PDF export | N | duration | n/a | evidence | pass/fail |
| AI mocked | N | duration | n/a | evidence | pass/fail |
| AI real provider | N | duration | n/a | provider-specific | integration only |

Tested ceiling equals the highest repeatedly passing stage that satisfies every applicable SLO for full steady-state and required soak—not highest stage that merely returns responses. Report achieved requests/second, iterations/second, active/peak VUs, utilization, dropped iterations, and saturation point. If adjacent stages straddle pass/fail, either binary-search with repeated runs or keep the lower tested stage. Operational safe limit applies a predeclared headroom factor (initial hypothesis 80%, rounded down) to tested ceiling; factor cannot change after results are seen.

Final output before telemetry calibration:

```text
safe concurrent normal users: N
safe concurrent DB-heavy operations: N
safe concurrent upload 5 MB: N
safe concurrent upload 50 MB: N
safe concurrent XLSX exports: N
safe concurrent PDF exports: N
safe concurrent AI mocked sessions: N
real-provider integration ceiling tested: N (not app capacity)
registered users: not established
MAU: not established
```

After sufficient production telemetry, registered-user/MAU planning ranges may be modeled from observed peak concurrency, request frequency, tenant skew, and active-user ratios; methodology and confidence interval must be documented.

## 13. Canary, monitoring hold, rollback, approval

Each production release remains separate:

1. DB role/credential release.
2. PostgreSQL config/telemetry release.
3. Expenses/report query release.
4. File lifecycle release.
5. Export guard release.

For every release:

- explicit approval artifact references commit, image, migration/config scope, evidence run ID, rollback image, and operator;
- deploy smallest scope;
- for ordinary code releases, authenticated canary with dedicated QA account/workspace;
- for DB credential release, do not call an all-container credential swap a canary: require production-equivalent clone rehearsal, production replacement, authenticated smoke, and monitoring hold. A true production canary requires separately approved weighted routing to a dedicated app container; otherwise skip that complexity;
- monitor at least 30 minutes for normal code-only change and longer maintenance window for DB/config changes as specified in release artifact;
- compare health, p95, errors, DB connections/locks, invariants;
- stop rollout and rollback on stated trigger.

Rollback triggers:

- health failure;
- auth/core CRUD failure;
- privilege denial on legitimate path;
- elevated privilege regression;
- schema/ledger drift;
- integrity mismatch;
- sustained latency/error threshold breach;
- cleanup/semaphore leak;
- DB recovery/start failure.

Production rollback never includes destructive restore unless corruption/data loss is proven, restore point selected, and separate approval obtained.

## 14. Upgrade triggers

Upgrade only from evidence:

1. Optimize proven query/index/cache issue.
2. Add vCPU when CPU is first sustained bottleneck.
3. Separate export/background worker when measured synchronous workload fails.
4. Separate PostgreSQL when DB resource/isolation evidence warrants it.
5. Add app replica/load balancer only after single-instance bottleneck is proven and session/job semantics support it.

Triggers include sustained CPU >70%, RAM >80%, DB connections >70%, repeated query >=500 ms, SLO failure, or upload/export interference with normal traffic.

## 15. Test and release gates

Canonical source gates:

```bash
npm run lint
./node_modules/.bin/tsc --noEmit --incremental false
./node_modules/.bin/vitest run
npm run build
```

Planned benchmark commands must be added to `package.json` with these stable interfaces before Phase 6:

```bash
npm run capacity:seed -- --profile expected --run-id <run-id>
npm run capacity:verify -- --run-id <run-id>
npm run capacity:test -- --profile expected --stage 100 --run-id <run-id>
npm run capacity:cleanup -- --run-id <run-id>
```

Every command records exit code and artifact path. The benchmark README provides exact end-to-end preflight, tool verification, auth bootstrap, seed/rerun, verify, collector start, watchdog start, explicit `k6 run`, recovery, invariant, cleanup, and artifact-finalization commands with environment contract and expected outputs. Missing command, missing/checksum-invalid/schema-invalid artifact, collector coverage gap, or skipped mandatory check fails the gate.

- Secret/redaction scan of evidence.
- Backup checksum + isolated restore rehearsal.
- Migration manifest/checksum verification.
- DB role positive/negative tests.
- ESLint.
- TypeScript.
- Targeted tests.
- Full test suite.
- Production build.
- Cross-tenant E2E.
- Billing-critical E2E.
- Authenticated dev smoke.
- Expenses correctness/concurrency/explain fixtures.
- Reports FX parity/explain fixtures.
- File lifecycle/state-machine/concurrency tests.
- Export matrix/rate/semaphore/termination tests.
- Benchmark pre/post invariants.
- Steady-state, soak, and recovery report.
- Explicit production approval.

## 16. Definition of Done

- Phase 0 evidence bundle complete, finalized append-only, checksummed, non-overwritable by run ID, and secret-clean.
- Fresh production backup restores successfully into isolated destination.
- Exact production config and rollback mechanism documented.
- Runtime app uses provisioned least-privilege `cubiqlo_app`; migrator and backup credentials separated.
- Role ownership/grant/revoke/default privilege matrix proven with negative tests.
- `pg_stat_statements`, I/O timing, and slow-query logging verified from authoritative production config.
- Expenses DB-side search/count/page contract passes >100-row, escaping, joined-search, concurrency, tenant, and explain tests.
- Reports explicit partial-FX semantics pass page/export parity fixtures.
- Task aggregates include task and workspace predicates; any optimization is evidence-led and non-duplicate.
- Every upload/download endpoint is inventoried; untrusted direct upload follows quarantine state machine; private objects remain unavailable before finalize.
- Signed downloads enforce exact authorization, key, TTL, disposition, and lifecycle.
- Every export endpoint has auth/scope/range/row/rate/semaphore/timeout contract.
- Reproducible pinned k6 scripts, deterministic dataset profiles, raw artifacts, invariants, and cleanup exist.
- Mocked-AI capacity and real-provider integration results remain separate.
- Acceptance thresholds, safety aborts, soak, recovery, release-appropriate canary or replacement smoke, monitoring hold, rollback triggers, and approval artifacts pass.
- Capacity report states workload-specific safe concurrency.
- Registered users and MAU remain `not established` until calibrated with production telemetry.
- No production mutation occurs without explicit approval.

## 17. Execution order

1. Phase 0 artifact/evidence and restore gate.
2. Phase 1 role provisioning and credential separation on clone/dev; separate approved production release.
3. Phase 2 authoritative PostgreSQL config on clone/dev; separate maintenance release.
4. Phase 3 query changes as small independently testable commits/releases.
5. Phase 4 file lifecycle as dedicated architecture release.
6. Phase 5 export controls.
7. Phase 6 benchmark.
8. Phase 7 capacity decision and telemetry calibration plan.

Do not combine DB credential change, PostgreSQL restart, query refactor, direct-upload architecture, or export admission changes into one production release.

No implementation, migration, restart, credential change, or production mutation was performed while revising this execution contract.
