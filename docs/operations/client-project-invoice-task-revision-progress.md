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
- Task 10 — editable reusable Task surface with locked mode and no no-op controls. Commit `b030c8e`. 9 tests and TypeScript passed.
- Task 11 — unified historical Project Tasks showing stored workflow and reusable rows together. Commit `8e2d537`. 9 tests and TypeScript passed.
- Task 12 — collision-safe Project reusable Task reorder with complete-ID validation. Commit `12bff28`. 12 tests and TypeScript passed.
- Task 13 — global Task pagination: filtered count, clamp, 10-row shared List/Board batch, preserved params. Commit `cfbd0a7`. 6 tests and TypeScript passed.
- Task 14 — global Task tabs use shared Invoice-style query-backed navigation and preserve filters. Commit `c9f81c0`. 3 tests and TypeScript passed.
- Task 15 — full Task Template create/edit/lifecycle dialogs with human labels and empty state. Commit `15ee513`. 3 tests and TypeScript passed.
- Task 16 — full Task Template item editing, remove, and one-step reorder with archived write guards. Commit `7ede10c`. 6 tests and TypeScript passed.
- Task 17 — hardened Task Template import preview: zero selection, reset state, preview fingerprint, stale rejection. Commit `ffa77cf`; 20 tests and TypeScript passed.
- Task 18 — full automated and PostgreSQL verification. ESLint, TypeScript, production-shape Docker build, 181 files/758 tests, and targeted PostgreSQL/Portal verification passed.
- Task 19 — browser QA partial. Desktop/mobile pagination 10/2, mixed-mode rendering, Template controls, scoped Client Project creation persistence, scoped Project Invoice creation persistence, and Portal controls passed 3/3; remaining Portal/Task/Template negative matrix pending. Evidence: `docs/operations/evidence/2026-08-01-client-task-revision-final-qa.md`.

## Current

- Task 19 — complete authenticated desktop/mobile mutation matrix, negative cases, and cleanup before feature-branch handoff.

## Release state

- Pushed: feature commits through `ffa77cf`; final QA fix/evidence awaiting commit and push.
- Integrated shared dev: no.
- Migrated dev: no.
- Deployed dev: no.
- Deployed production: no; explicit approval required.
