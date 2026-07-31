# Client, Project, Invoice, Portal, and Task Workspace Revision Design

**Date:** 2026-08-01
**Status:** Approved product design; awaiting written-spec review before implementation plan
**Scope:** Cubiqlo authenticated Client, Project, Invoice, Portal, global Tasks, and Task Templates UX

## 1. Goals

1. Let users create a Project directly from Client detail without selecting the Client again.
2. Replace Project-detail Billing tab with a focused Invoice tab and Project-scoped Invoice dialog.
3. Preserve navigation origin across Project, Client, and Invoice detail.
4. Make Client Portal password state explicit and allow authorized users to reveal newly stored passwords safely.
5. Show all historical Project Tasks regardless of current billing-default mode and make every Task editable according to its stored mode.
6. Replace Task Template scaffolding with complete, predictable CRUD/import UX.
7. Add real server pagination to global Tasks at 10 Tasks per page.
8. Align Task tabs and controls with established Invoice/list-page visual patterns.

## 2. Non-goals and safety boundaries

- Do not store portal passwords as plaintext.
- Do not remove legacy password hashes, Activity/Service schema, or historical Task fields.
- Do not convert existing Task modes automatically.
- Do not allow a Project-scoped Invoice to include another Project.
- Do not rely on browser history for application Back targets.
- Do not deploy until full automated and authenticated browser gates pass.

## 3. Client detail — Project creation

### UI

The Client detail `Proyek` tab gets a compact toolbar with count/context on the left and `Tambah Proyek` on the right. The button opens the existing Project form inside a responsive app Dialog.

### Scope and behavior

- Client ID comes from the Client detail route and is locked.
- Client selector is not rendered.
- All other supported Project fields remain available.
- Existing tenant and plan-limit server validation remains authoritative.
- When the plan limit is reached, the button is disabled with a clear limit/upgrade explanation.
- On successful creation, close the Dialog, remain on `?tab=projects`, refresh the list, and show success feedback.

### Reuse

Extend `ProjectCreateDialog` to accept optional `clientId`. It passes the scope to `ProjectForm`; no duplicate Client-specific Project form is created.

## 4. Project detail — Invoice tab and creation

### Tab

Rename `Billing` to `Invoice`. Remove the duplicated commercial summary from tab content because billing model, Project value/rate, and currency already appear under the Project header.

The tab contains:

- `Buat Invoice` toolbar action;
- list of Invoices related to the current Project;
- consistent localized status and currency formatting.

### Project-scoped Invoice dialog

`Buat Invoice` opens an app Dialog instead of navigating to `/app/invoices/new`.

- Client and Project derive from the current Project.
- Neither Client nor Project selector is rendered.
- The Project is immutable for this flow.
- Invoice fields for dates, items, discounts, tax, notes, terms, and supported payment metadata remain available.
- Invoice server action revalidates that Project belongs to active workspace and Client.
- On success, close Dialog, remain in Project `Invoice` tab, refresh list, and show success feedback.

Global Invoice creation remains a separate unrestricted flow.

## 5. Explicit Invoice origin navigation

Invoice links use an explicit, validated origin contract rather than browser history.

Supported origins:

- `project`: back target is `/app/projects/{projectId}?tab=invoice`;
- `client`: back target is `/app/clients/{clientId}?tab=invoices`;
- `global`: back target is `/app/invoices`.

Rules:

- Project Invoice list appends Project origin to Invoice detail links.
- Client Invoice tab appends Client origin.
- Global Invoice list uses global origin or no origin.
- Invoice detail validates referenced origin resource inside the active workspace before rendering its Back link.
- Invalid/missing origin falls back to global Invoice list.
- Newly created Project-scoped Invoice stays in its dialog origin and does not navigate to Invoice detail.

## 6. Client Portal password UX and storage

### State model

#### No password

Show:

- `Password portal belum dibuat`;
- short explanation that Client cannot sign in until a password is created;
- `Buat password` action.

#### Legacy hash-only password

Show:

- masked `••••••••`;
- `Password aktif, tetapi password lama tidak dapat ditampilkan`;
- `Ganti password` action.

#### New hash + encrypted password

Show:

- masked password by default;
- `Lihat password`, `Sembunyikan`, `Salin`, and `Ganti password` actions;
- reveal only for workspace owner/admin;
- record reveal/copy-sensitive action in audit log.

### Storage

- Keep one-way hash as authentication source.
- Add nullable encrypted ciphertext and encryption-version metadata for authorized display.
- Encryption key is required from runtime environment and never stored in DB/repository/evidence.
- Use authenticated encryption with random nonce.
- Never log plaintext, ciphertext, key, revealed value, or password-bearing action payload.
- Existing hashes are not recoverable; ciphertext begins only after password is newly created or changed.
- Password mutations update hash and ciphertext atomically.
- Missing/invalid encryption key fails closed and leaves existing hash unchanged.

### Portal status

Create one shared status helper used by Client summary and Portal section. Portal active requires the approved slug/access state plus a valid password hash; UI must not label incomplete access as active.

## 7. Project Tasks — unified historical visibility

### Unified list

Project detail shows one combined Task list containing every stored Task for the Project, regardless of current Project billing-default mode.

Each Task displays a mode badge:

- `Workflow`;
- `Reusable`.

The Project billing policy controls the default mode for newly created Tasks only. Existing `tasks.mode` remains canonical and unchanged.

### Editing

Every Task is editable according to its stored mode:

- Workflow: title, description, assignee, status, priority, due date, Client visibility.
- Reusable: title, description, default assignee, active/archive lifecycle.

No implicit mode conversion occurs during edit.

### Controls

A single compact toolbar aligns with Project tabs/content:

- Fixed Price/default workflow: `Tambah Tugas`, `List`, `Board`.
- Hourly/Retainer/default reusable: `Tambah Tugas`; combined list still includes historical workflow Tasks.

Toolbar wraps safely on mobile. Reorder controls render only when functional:

- desktop drag where supported;
- accessible up/down controls for mobile/keyboard;
- no active-looking no-op buttons.

## 8. Global Tasks

### Pagination

Global Tasks uses server pagination with exactly 10 Tasks per page.

- Add filtered count query.
- URL uses `page=N`.
- Preserve search, status, priority, Project, Client, mode, and tab parameters.
- Render `Sebelumnya`, page indicator, and `Berikutnya`.
- Clamp invalid pages safely.
- Reset page to 1 when filters change.
- List and Board use the same 10-row page so counts/navigation remain consistent.

### Tabs and visual style

Use the same compact tab treatment as Invoice and other established list pages:

- `Tugas Proyek`;
- `Template Tugas`;
- consistent active state, spacing, responsive overflow, and query-backed state.

## 9. Task Template workspace

### Template CRUD

Replace shortcut/scaffolding behavior with app-native Dialogs.

Create/edit fields:

- name;
- description;
- target: Fixed Price, Hourly/Retainer, All.

Support:

- create;
- edit;
- archive;
- restore;
- duplicate.

Archived templates are visibly read-only until restored. Human labels replace raw enum values.

### Template item CRUD

Each item supports:

- create;
- edit title;
- edit description;
- select default assignee;
- remove;
- move up one position;
- move down one position;
- desktop drag only if it uses the same transactional reorder contract.

All actions remain workspace-scoped and reject archived-template writes server-side.

### Import flow

- Use styled Select/search controls, not native raw controls.
- Empty templates show a clear empty state.
- Incompatible override label is `Izinkan template tidak cocok`.
- Preview stores a fingerprint/snapshot of template selection, override state, selected item IDs, and duplicate decisions.
- Changing template selection or compatibility override invalidates preview and clears stale item state.
- Selecting zero items means zero items; it must never silently become all items.
- Submit revalidates that current input matches preview snapshot/fingerprint.
- Existing DB idempotency and atomic import guarantees remain authoritative.

## 10. Client Invoice and Portal polish

Within touched Client detail areas:

- localize Invoice statuses;
- format amounts with existing currency formatter;
- add accessible names to Portal link/copy/reveal controls;
- use shared Portal status helper;
- keep tab/list styling consistent with surrounding pages.

## 11. Data and migration design

A new additive migration is required only for reversible Portal password storage and related audit metadata.

Before reserving a number:

1. fetch all refs;
2. inspect active worktrees and untracked migrations;
3. reconcile migration registry and active board;
4. reserve next free migration number.

Migration must:

- add nullable encrypted password fields/version only;
- preserve existing hash values;
- avoid destructive DDL;
- add no plaintext default/backfill;
- support hash-only legacy rows;
- include tenant-safe/audit indexes where needed.

Rehearse on a disposable PostgreSQL 16 restore before any production application.

## 12. Error handling and permissions

- Client-scoped Project create revalidates Client/workspace membership.
- Project-scoped Invoice create revalidates Project/Client/workspace relation.
- Origin parameters never grant access and are validated before use.
- Portal reveal is owner/admin-only and fails closed without key/ciphertext.
- Template and Task mutations remain workspace-scoped.
- Dialogs preserve input after recoverable server errors and close only on confirmed success.
- No native `window.prompt` or `window.confirm` is allowed.

## 13. Test strategy

### Automated

Write failing tests before each implementation slice:

1. Client-scoped Project Dialog and hidden Client selector.
2. Project-scoped Invoice Dialog and immutable Project context.
3. Explicit Invoice origin links and fallback.
4. Portal encryption round trip, missing-key failure, legacy hash-only state, owner/admin reveal guard, audit event.
5. Combined historical Task visibility and mode-specific edit fields.
6. Reusable Task editing and functional reorder controls.
7. Global Tasks count/pagination/filter preservation.
8. Template CRUD/item CRUD/reorder/archive behavior.
9. Import preview invalidation, zero-selection semantics, fingerprint/idempotency behavior.
10. Localized Client Invoice formatting and accessible Portal controls.

Run targeted tests, full Vitest, ESLint, TypeScript, production build, and real PostgreSQL integration tests.

### Browser QA

Authenticated desktop and 390×844 QA must cover:

- Client creates Project without Client selector and remains on Client tab.
- Project creates Invoice in Dialog; Project/Client are locked; list refreshes.
- Invoice detail Back target from Project, Client, and global contexts.
- Portal no-password, legacy hash-only, new encrypted-password reveal/hide/copy/change states.
- All seven existing Hourly Tasks visible in one combined list.
- Workflow and reusable Tasks editable.
- Fixed Price Task toolbar alignment and List/Board behavior.
- Template create/edit/item/reorder/archive/restore/import.
- Global Tasks pagination at 10 with preserved filters.
- Zero horizontal overflow and zero app-origin console/page errors.

Use isolated QA records and clean them afterward. Never reset a real user password.

## 14. Release strategy

Deliver in small coherent commits, then one release gate:

1. scoped Project creation;
2. scoped Invoice dialog and navigation origin;
3. Portal password storage/state;
4. unified Project Tasks and editing;
5. global Task pagination/tab style;
6. Template workspace/import hardening;
7. full evidence/docs;
8. production backup, migration rehearsal, immutable image, deploy, authenticated live QA.

Before deploy, follow VPS guardrails: `dokploy-traefik` remains sole public proxy on 80/443, run collision checks before/after, preserve production environment, retain rollback image, and apply only reviewed additive migration.

## 15. Acceptance criteria

- Client detail can create a Project without selecting Client.
- Project creation closes Dialog and refreshes Client Project tab.
- Project detail tab is `Invoice`, not `Billing`.
- Project Invoice creation is a scoped Dialog with no Client/Project selector.
- New Project-scoped Invoice stays in Project Invoice tab after success.
- Invoice detail Back returns to explicit Project/Client/global origin.
- Portal password states are truthful; new passwords can be revealed by owner/admin from encrypted storage, never plaintext DB.
- All historical Project Tasks are visible in one list with mode badges.
- Workflow and reusable Tasks are editable according to stored mode.
- Fixed Price Task controls align in one compact toolbar.
- Global Tasks displays 10 per page with working previous/next navigation.
- Task tabs match established Invoice-style tabs.
- Template and template items support complete create/edit/archive/restore/reorder flows.
- Import cannot reuse stale preview state or turn zero selection into all items.
- Client Invoice statuses/amounts are localized/formatted.
- Full automated, DB, desktop, mobile, health, proxy, and live QA gates pass before completion.
