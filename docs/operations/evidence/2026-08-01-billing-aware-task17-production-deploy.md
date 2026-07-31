# Billing-Aware Tasks — Task 17 Production Deployment Evidence

Deployment window: 2026-08-01
Source commit: `9a40a7d93b7671f3e75f4b43d53fb61019bff8f9`
Production image: `cubiqlo-prod:sha-9a40a7d93b76`
Production image ID: `sha256:5dfd99d043d5780fc6b648945cbe80a7748b39cc6715e752086a0049a5224731`
Production app container: `cubiqlo-new-app`
Production database: `cubicle`

## Approval and source gate

- Alip explicitly approved continuation with `gas lanjut` after Task 17 was identified as production gate.
- `git fetch origin` found zero remote-only commits.
- Task 16 evidence commit was pushed before production deployment.
- Local `HEAD` and `origin/main` both resolved to `9a40a7d93b7671f3e75f4b43d53fb61019bff8f9`.

## Proxy and runtime safety

- Read `DEPLOYMENT_GUARDRAILS.md` and `DEPLOY_RULES.md`.
- Ran `/root/.hermes/shared-workspace/PRE_DEPLOY_CHECK.sh` before build and after deploy.
- `dokploy-traefik` remained sole public owner of ports 80/443.
- App has `PortBindings={}` and only joins `dokploy-network`.
- No new Traefik router or catch-all route was added.
- Existing production environment was captured to mode-600 backup and reused exactly for app recreation.
- Existing restart policy `unless-stopped` was preserved.

## Backup and restore proof

Backup directory: `/root/backups/cubiqlo-task17-20260731T172019Z`

- Custom-format backup: `cubicle.dump`
- Backup bytes: `454780`
- SHA-256: `4633d800f6366dae01315eaeb6a4a20f6803912bc7b6ad1f5a869e6f931beced`
- `sha256sum -c`: PASS before rehearsal and production migration.
- Restored into disposable DB `task17_restore_20260731172019`.
- Source and restored counts matched: users 25, workspaces 27, projects 45, tasks 105.
- Applied only `drizzle/0064_billing_aware_task_templates.sql` to restored clone.
- Rehearsal result: template tables present; zero null task modes; zero null project policies.
- Disposable restore DB was dropped by cleanup trap.

Rollback handles:

- Previous production image metadata: `image-rollback.txt`
- Previous image retained under `cubiqlo-prod:rollback-pre-task17-<UTC timestamp>`.
- Database rollback source: verified custom-format backup above.

## Production migration

Applied exactly `drizzle/0064_billing_aware_task_templates.sql` with `ON_ERROR_STOP=1`.

Result:

- `task_templates`: present
- `task_template_items`: present
- `task_template_imports`: present
- 105 existing tasks backfilled
- workflow tasks: 83
- reusable tasks: 22
- `tasks.mode IS NULL`: 0
- `projects.task_mode_policy IS NULL`: 0
- `tasks.lifecycle IS NULL`: 0
- `tasks_project_workspace_fk`: validated
- `tasks_template_item_source_workspace_fk`: validated
- Migration `0062` was not executed.

## App deployment

- Tagged previous image before recreation.
- Built immutable image from pushed commit `9a40a7d`.
- Recreated only `cubiqlo-new-app`.
- Internal `/api/health`: `status=ok`, `db=ok`.
- Production image ID matches newly built artifact.

## Public health and isolation

- `https://cubiqlo.com/api/health`: HTTP 200, DB ok
- `https://app.cubiqlo.com/api/health`: HTTP 200, DB ok
- Unrelated `https://9router-43-134-165-218.sslip.io/`: HTTP 307 to its own `/dashboard`; no Cubiqlo bleed
- Production app log scan: no `42P01`, `42703`, `Application error`, or application `Error:` match

## Authenticated live browser QA

Created isolated QA owner/member/viewer workspace after migration, ran browser QA, then removed all three QA users and their workspace. Cleanup verification: zero matching QA users and zero QA workspace rows.

Playwright 1.61.1 Chromium checked desktop 1440×1000 and mobile 390×844:

- global Tasks shows `Tugas Proyek` and `Template Tugas`
- Fixed Price project detail: HTTP 200
- Hourly project detail: HTTP 200
- legacy package project detail: HTTP 200 and read-only state
- Time: HTTP 200
- Reports: HTTP 200
- `/app/services` redirects to `/app/tasks`
- `/app/time/activities` redirects to `/app/time`
- route/error failures: 0
- horizontal overflow: 0
- application error cards: 0
- app console/page errors: 0

Cloudflare injected its Web Analytics beacon on public responses. CSP correctly blocked 16 `static.cloudflareinsights.com/beacon.min.js` loads because application `script-src` is self-only. Classified as external Cloudflare/CSP noise, not app-origin error; no route or functionality failed.

Raw operational evidence remains under `/root/backups/cubiqlo-task17-20260731T172019Z/`.
