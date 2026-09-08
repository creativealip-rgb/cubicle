# Client, Project, and Time UX Release — 2026-09-08

## Scope

- Client detail uses KPI strip above tabs and an Overview with Client Details, recent Projects, and recent Invoices.
- Recent Project/Invoice actions stay aligned at card footers; Client header keeps Edit, Archive, and Delete only.
- Client and Project detail expose the canonical password-gated Client Portal URL when enabled.
- Client create/edit supports an optional custom Client ID; empty values retain automatic numbering and workspace uniqueness remains enforced.
- Time-entry rows no longer duplicate timer, copy, or edit actions; editable rows open the existing edit flow directly.
- New Project Client picker uses a portaled, scrollable 14px list with a toggle chevron.
- Inline `Create new client` accepts only Client name, creates and selects the Client, and keeps New Project open.

## Production

- Branch: `main`
- Commit: `0a9ce94`
- Image: `cubiqlo-prod:sha-0a9ce94`
- Container: `cubiqlo-new-app-next`
- Public proxy: unchanged; `dokploy-traefik` remains sole public 80/443 proxy.

## Verification

- Vitest: 382 files, 1,750 tests passed.
- ESLint: passed.
- Next.js production build: passed.
- Health endpoint: `status=ok`, `db=ok`.
- Browser QA: footer actions aligned; timesheet row actions absent; Client picker toggles, portals outside dialog layout, scroll area works, and inline Client creation auto-selects without closing New Project.
- Mutation QA fixture was deleted after verification.

## Commits

- `d1ee859` — pin Client Overview actions to card footer.
- `0eede5a` — support custom Client IDs.
- `0c12469` — remove redundant timesheet actions.
- `fc2b1b7` — toggle Project Client picker.
- `d62a4ba` — add portaled Project Client picker and create action.
- `0a9ce94` — simplify Client creation to inline name-only flow.
