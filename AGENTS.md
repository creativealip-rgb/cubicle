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
