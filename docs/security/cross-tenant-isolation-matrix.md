# Cross-Tenant Isolation Matrix

**Audit date:** 25 July 2026

## Roles

- Owner: read and write own workspace.
- Member: read and write own workspace.
- Viewer: read own workspace, no mutation.
- Outsider: no access.
- Public client: only resources tied to client resolved by valid portal token.

## Covered boundaries

- Clients: resource lookup requires current workspace.
- Projects: create/update validates referenced client belongs to current workspace.
- Tasks: create validates project; create/update/assign validates assignee membership.
- Invoices: create validates client, project, and project/client relationship; updates scope invoice by workspace.
- Proposals: create validates client belongs to supplied writable workspace; public actions require proposal ID plus matching token hash.
- Contracts: create validates client, project, project/client relationship, and template workspace.
- Expenses: relation resolver validates optional client/project and aligns project owner.
- Files: upload validates client/project, storage-key workspace prefix, and mutation resource workspace.
- Portal requests: admin create/update require writable role; public mutation scopes request by both token client ID and workspace ID.

## Automated regression

- `src/lib/tenant-reference-rules.test.ts`: 9 behavior tests for foreign client/project/member references and owner/member/viewer role policy.
- `src/lib/tenant-boundary-wiring.test.ts`: 7 source-boundary tests preventing removal of critical authorization calls.
- Existing application suite remains mandatory.

## Fixed findings

1. Project create/update accepted foreign `clientId`.
2. Task create accepted foreign `projectId`.
3. Task create/update/assign accepted non-member `assigneeId`.
4. Proposal create accepted foreign `clientId`.
5. Contract create accepted foreign client, project, or template references and project/client mismatch.
6. Portal request admin create/update allowed viewer mutation.

## Browser E2E evidence

Completed 25 July 2026 against disposable `cubicle_e2e` without production data.

- Workspace A owner listed A resources but could not list/open B clients or projects.
- Owner and member created clients only inside workspace A.
- Viewer read workspace A but client mutation was rejected.
- Outsider could not see workspace A or B resources.
- Postconditions: viewer-forbidden rows `0`; unexpected workspace B mutations `0`.

Suite: `e2e/cross-tenant.spec.ts`. Authentication uses Better Auth API because target is tenant boundaries, not login form stability. Keep workers at `1`; login rate limit is 5 requests per 5 minutes per IP.

## Residual risk

Current browser coverage exercises client/project isolation plus role mutation policy. Invoice, proposal, contract, expense, file, portal request, and public-token boundaries remain covered by unit/source guards, not browser E2E.
