# Client, Project, Invoice, Portal, and Task Workspace Revision Progress

Branch: `feat/client-project-invoice-task-revision`
Plan: `docs/plans/2026-08-01-client-project-invoice-task-workspace-revision.md`

## Completed

- Task 0 — migration `0065` reserved. Commit `6740daf`.
- Task 1 — Client-scoped Project dialog. Commits `d34ab45`, `45553dc`. Targeted tests, TypeScript, ESLint passed.
- Task 2 — tenant-safe Invoice origin policy. Commit `8e1989b`. 15 targeted tests passed.
- Task 3 — Project-scoped Invoice dialog. Commit `9c749e0`. 32 targeted tests and TypeScript passed.
- Task 4 — Client Invoice formatting and Portal control accessibility. Commit `63203e5`. 11 targeted tests, TypeScript, and ESLint passed.
- Task 5 — authenticated Portal password encryption primitive. Commit `15b2f76`. 8 tests, TypeScript, and ESLint passed.
- Task 6 — additive Portal password ciphertext schema. Commit `cad7643`. 2 tests and TypeScript passed; PostgreSQL 16 clone apply, legacy-null check, encrypted fixture, replay, and cleanup passed.
- Task 7 — atomic Portal password mutation and owner-only guarded reveal. Commit `0201762`. 14 tests and TypeScript passed.
- Task 8 — truthful Client Portal password states with masked owner reveal/copy UX. Commit `d239692`. 10 tests, TypeScript, and ESLint passed.
- Task 9 — combined Project Task presentation model preserving stored mode. Commit `a7faeb6`. 3 tests and TypeScript passed.
- Task 10 — editable reusable Task surface with locked mode and no no-op controls. 9 tests and TypeScript passed.

## Current

- Task 11 — unified historical Project Tasks.

## Release state

- Pushed: pending first feature-branch sync.
- Integrated shared dev: no.
- Migrated dev: no.
- Deployed dev: no.
- Deployed production: no; explicit approval required.
