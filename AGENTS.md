# Cubiqlo Agent Instructions

These instructions apply to every agent working anywhere inside `/root/projects/cubicle`.

## Mandatory context before work

Before planning, editing, testing, deploying, or reviewing Cubiqlo:

1. Read `docs/dev-production-workflow-plan.md`.
2. Read `docs/architecture-security-hardening-plan.md` for architecture, security, database, migration, backup, transaction, and production-hardening work.
3. Treat both documents as canonical: environment/release decisions come from the workflow plan; hardening priorities and phase gates come from the hardening plan.
4. Check `git status --short --branch` before editing. Preserve unrelated changes.
5. Do not use production as a preview environment.
6. UI polish belongs on `dev.cubiqlo.com` and ships to production in batches.
7. Production remains `cubiqlo.com` for landing and `app.cubiqlo.com` for dashboard.
8. Development must use isolated DB, auth/cookies, email, payment, and storage.
9. Do not create or activate staging unless Alip approves it. Staging design remains documented for future use.
10. Never use `docker cp` to deploy Next.js code and never use `docker restart` to load a newly built image.
11. Before any production deployment, follow release gates, backup rules, deployment commands, health checks, smoke tests, and rollback notes in the canonical workflow document.

## Shared development integration rules

1. Feature agents own implementation branches only. They may edit, test, commit, and push, but must not migrate `cubicle_dev`, build/recreate `cubicle-dev`, or deploy `dev.cubiqlo.com` directly.
2. `dev/integration` is the only branch allowed to deploy shared `dev.cubiqlo.com`.
3. Wowo/main Hermes is default integration owner. Another agent may deploy shared dev only when Alip explicitly delegates ownership for that deployment.
4. Before integration: fetch remote refs, inspect all worktrees including untracked migrations, merge completed feature commits, then run combined lint, typecheck, tests, and build.
5. Shared-dev deployment must use `scripts/operations/deploy-dev-integration.sh`. Direct Docker mutation of `cubicle-dev` is forbidden for feature agents.
6. Never bypass the host `flock` when another dev deployment is active.
7. Reserve migration numbers in `docs/migration-registry.md` before creating SQL.
8. Every handoff must report separately: implemented, tested, committed, pushed, integrated, migrated-dev, deployed-dev, deployed-production.
9. Production remains approval-gated. `dev/integration` must not be merged/deployed to production without Alip's explicit approval and production release gates.

If task instructions conflict with the canonical workflow, stop and report conflict before changing runtime or deployment infrastructure.

## Shared project context

For cross-agent status or handoffs, also read:

- `/root/.hermes/shared-workspace/SHARED_CONTEXT.md`
- `/root/.hermes/shared-workspace/ACTIVE_BOARD.md`

Keep durable Cubiqlo workflow decisions in repo documentation. Do not rely only on chat memory.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
