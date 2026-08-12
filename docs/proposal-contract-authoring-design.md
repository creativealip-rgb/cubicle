# Proposal & Contract Authoring Design

**Date:** 2026-08-12
**Status:** Approved for implementation

## Goal

Allow proposals and contracts to be created before a Client record exists, then edited in a block-based document editor with autosave and explicit Save.

## Product decisions

- Create forms remain simple.
- Proposal recipient is manual: name required, email optional until send, company optional.
- Contract recipient is manual: name and email required, company optional.
- Proposal and contract drafts do not create Client records.
- Contract signing is the approval event; no separate approved status.
- After contract signing, show optional notification/action to create Client from contract recipient data.
- Proposal acceptance never offers Client creation.
- Editor uses document blocks, not spreadsheet cells or unrestricted freeform canvas.
- Autosave plus explicit Save button.
- Proposal supports text, images, and attachments.
- Contract supports text, clauses, placeholders, and a protected signature block.
- Contract number is the only contract identifier; no invoice-number field.

## Create forms

### Proposal

- Template, optional
- Title, required
- Client name, required
- Client email, optional until send
- Company name, optional
- Proposal number, auto-generated and editable
- Valid until, optional
- Currency, default IDR

### Contract

- Template, optional
- Title, required
- Client name, required
- Client email, required
- Company name, optional
- Contract number, auto-generated and editable
- Contract date, default today
- Valid until, optional

After creation, navigate to `/app/proposals/[proposalId]/edit` or `/app/contracts/[contractId]/edit`.

## Data model direction

Existing `clientId` becomes nullable for proposals and contracts. Add recipient snapshot fields to both documents: `clientName`, `clientEmail`, and `companyName`. Keep `clientId` nullable for the optional post-sign Client link.

Store editor content as versioned JSON block data. Preserve legacy markdown/text rows for read compatibility during migration. At send time, snapshot recipient and resolved content into immutable sent data.

Contract fields add `contractNumber` and `contractDate`. Proposal fields add `proposalNumber`. Template content becomes initial block content copied into the new document.

## Placeholder model

Use one resolver for editor preview, public view, email, and PDF. Initial placeholders:

- `{{client_name}}`
- `{{client_email}}`
- `{{company_name}}`
- `{{proposal_number}}`
- `{{contract_number}}`
- `{{contract_date}}`
- `{{valid_until}}`
- `{{workspace_name}}`
- `{{workspace_address}}`

## Editor

Shared block editor shell with document-specific allowed blocks.

Proposal blocks: heading, text, bullet list, numbered list, image, attachment, pricing table, divider, placeholder.

Contract blocks: heading, text, numbered clause, bullet list, table, placeholder, signature block, divider.

The signature block remains a typed system block so signing and PDF rendering cannot be broken by arbitrary text editing.

## Lifecycle

Draft creation requires no Client record. Send validates required recipient data, resolves placeholders, stores a snapshot, and preserves current send/sign lifecycle. Contract signing sets status to `signed`; the detail page then offers `Tambah client` or `Nanti`. Creating the Client links `contract.clientId` while retaining recipient snapshot fields.

## Acceptance gates

- Create proposal with no Client record.
- Create contract with no Client record.
- Edit blocks directly in canvas.
- Autosave and explicit Save both persist.
- Proposal image and attachment blocks persist and render.
- Contract placeholders resolve consistently in preview, public page, email, and PDF.
- Contract signing remains atomic and sets `signed`.
- Post-sign Client creation is optional and idempotent.
- Existing historical proposal/contract rows remain readable.
- Existing send, acceptance, signature, permission, and email behavior remains intact.

## Scope exclusions

No realtime collaboration, spreadsheet grid, freeform absolute positioning, complex nested blocks, or production deployment in this implementation batch.

## Risks

Schema migration and legacy compatibility are required because current proposal and contract `clientId` columns are non-null and current contract content is markdown-based. Any migration must be additive and tested against existing rows before UI rollout.

## Implementation order

1. Schema and migration compatibility.
2. Placeholder/block domain helpers and tests.
3. Draft create actions and simplified forms.
4. Editor shell, blocks, autosave, and Save.
5. Proposal media and attachments.
6. Contract signature block and recipient-create action.
7. Preview/send/PDF/public compatibility.
8. Browser QA and regression verification.

No implementation should be declared complete from source tests alone; deployed browser and persistence evidence are separate gates.
