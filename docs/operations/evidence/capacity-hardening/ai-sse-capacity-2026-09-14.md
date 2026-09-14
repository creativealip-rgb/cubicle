# AI Assistant & Quota Isolation Capacity — 2026-09-14

## Verdict

`SAFE TESTED LEVEL` with deterministic local mock provider ($0 cost, 0 upstream rate limit). The atomic per-user rate limit, monthly quota isolation between workspace members of different plans, SSE chunk streaming, and refund safety are proven under concurrency.

## Scope & Workload

- Target: Isolated HTTPS app `:3443`, PostgreSQL clone `cubiqlo_capacity`, Redis clone, Mock AI HTTP server.
- Workload: Concurrent chat SSE streams (`ReadableStream` text/event-stream readers) from multiple authenticated users with differing plans inside the same workspace:
  - Owner (`Solo` plan, limit 150 AI requests/month): 20 concurrent requests.
  - Member (`Free` plan, limit 15 AI requests/month): 20 concurrent requests.
- Deterministic verification:
  - Owner: 20/20 completed SSE streams with `event: content` and `event: done` (HTTP 200). Counter = 20.
  - Member: 15/20 completed SSE streams (HTTP 200), 5/20 rejected with atomic `HTTP 429` (Limit 15 reached). Counter capped at 15.
  - Refund safety: Pre-provider validation failures do not leak or decrement quota.
  - DB Invariants: 0 idle in transaction, 0 blocked locks, 0 deadlocks, 0 container restarts, 0 OOM.

## Schema & Architecture Change

- Discovered and resolved contract bug where `ai_usage_daily` was keyed only by `workspace_id`, causing different members with different plan limits to conflict and share a single counter.
- Added migration `0101_ai_usage_per_user.sql`:
  - Adds `user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE`.
  - Backfills historical usage to workspace owner, deterministically summing counts for multi-workspace owners before applying `UNIQUE (user_id, usage_date)`.
  - Preserves `workspace_id` for audit indexing.
- Refactored `checkAiRateLimitDb` and `releaseAiQuota` across all AI entry points (`chat`, `action`, `personal-site-ai`, `visual-prompts`) to resolve quota against `session.user.id` / `user.id`.

## Evidence & Manifest

- Test manifest: `/root/backups/cubiqlo/ai-capacity-20260914/`
- Manifest SHA-256: `42c0c66f98bcef20e3c65026dc938380c018643422630e31d680e88e08fbab5e`
- Live production credentials, keys, and cookies were never touched.

## Limitations

- Upstream model latency, token pricing, external provider 5xx, and large scale concurrent LLM soak on real cloud providers remain `NOT ESTABLISHED` and require dedicated budget authorization.
