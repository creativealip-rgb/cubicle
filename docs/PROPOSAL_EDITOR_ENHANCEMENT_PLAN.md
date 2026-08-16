# Proposal Editor Enhancement Plan

**Tanggal:** 2026-08-16
**Branch:** `dev/integration` (base `3afccee`)
**Tujuan:** bikin pembuatan proposal lebih "proper" — cover/header, placeholder finansial, template bawaan, pricing table preset.

---

## Konteks & arsitektur saat ini

- **Editor dokumen:** `src/components/documents/document-block-editor.tsx` — 3 kolom (Struktur | canvas | Insert+Properties), sudah punya table editable, alignment teks (`align: left|center|right`), scroll-to-block dari Struktur.
- **Model blok:** `src/lib/document-blocks.ts` — `DocumentBlock` (type: heading/text/list/divider/placeholder/signature/image/attachment/table, field `align`, `rows`, `level`, `items`, `ordered`), `defaultDocumentBlocks(kind)`, `normalizeDocumentBlocks()`.
- **Placeholder:** `src/lib/document-placeholders.ts` (resolver generik `{{key}}`) + `src/lib/document-placeholder-values.ts` (builder `buildProposalPlaceholderValues` / `buildContractPlaceholderValues`).
- **Renderer:** `src/lib/document-block-renderer.tsx` (`renderDocumentBlock` plain untuk PDF, `renderDocumentBlockHtml` untuk web).
- **PDF:** `src/components/proposals/proposal-pdf.tsx`, `src/components/contracts/contract-pdf.tsx`.
- **Edit page:** `src/app/(app)/app/proposals/[proposalId]/edit/page.tsx` — **GAP: tidak pass `placeholderValues` ke editor** (contract edit page SUDAH pass). Ini yang bikin `{{client_name}}` dsb. tidak ter-resolve di preview editor proposal.

## Keputusan desain

1. **TIDAK menambah block type baru.** Cover/header direalisasikan memakai blok existing:
   - `heading` level 1 `align: center` + `text`/`placeholder` `align: center` + `divider`.
   - Field `align` sudah ada — tinggal dipakai.
2. **Placeholder finansial ditambahkan sebagai key baru** (snake_case), diregistrasi di builder, resolver tetap generik.

## Placeholder key final (proposal)

| key | sumber |
|---|---|
| `client_name` | proposal.clientName |
| `client_email` | proposal.clientEmail |
| `company_name` | proposal.companyName |
| `workspace_name` | workspace.name |
| `workspace_address` | workspace.billingAddress |
| `proposal_number` | proposal.proposalNumber (hanya bila ada) |
| `valid_until` | proposal.validUntil (format id-ID) |
| `today` | tanggal sekarang (format id-ID) |
| `subtotal` | proposal.subtotal |
| `tax` | proposal.tax |
| `total_amount` | proposal.total |
| `down_payment` | total * downPaymentPercent/100 |

Contract builder (`buildContractPlaceholderValues`) mendapat tambahan `today`, `subtotal`, `tax`, `total_amount`, `down_payment` bila relevan (contract tidak selalu punya line items — injeksi `undefined` aman, resolver biarkan token literal bila key kosong).

## Scope & ownership batch

Batch dibagi by exact file ownership supaya paralel tanpa konflik.

### Batch A — Data & placeholder (foundational, lib murni)
Files:
- `src/lib/document-blocks.ts`
- `src/lib/document-placeholder-values.ts`
- test baru `src/lib/proposal-starter-placeholder-wiring.test.ts`

Deliver:
- `buildProposalStarterBlocks()` helper → `DocumentBlock[]` starter proposal:
  1. heading lvl1 "Proposal" align center
  2. text `{{workspace_name}}` align center
  3. text `Untuk: {{client_name}}` align center
  4. divider
  5. heading lvl2 "Tentang Kami" (About)
  6. text (kosong, placeholder instruksi)
  7. heading lvl2 "Ruang Lingkup" (Scope)
  8. list (3 item kosong)
  9. heading lvl2 "Timeline"
  10. text (kosong)
  11. heading lvl2 "Investasi" (Pricing)
  12. table preset pricing (header Item/Qty/Price/Amount + 1 baris contoh)
  13. heading lvl2 "Syarat & Ketentuan" (Terms)
  14. text `Berlaku sampai {{valid_until}}`
- `buildProposalPlaceholderValues` + `buildContractPlaceholderValues` extend dengan key di atas (extend `DocumentValueSource` dengan `subtotal/tax/total/downPaymentAmount`).
- `defaultDocumentBlocks("proposal")` tetap (jangan break); starter baru via helper terpisah.

### Batch B — Renderer & PDF
Files:
- `src/lib/document-block-renderer.tsx`
- `src/components/proposals/proposal-pdf.tsx`
- `src/components/contracts/contract-pdf.tsx`

Deliver:
- Pastikan heading/placeholder render pakai `align` (web sudah, pastikan PDF `textAlign` sudah dipakai — sudah ada di commit `3afccee`; verifikasi).
- Inject `today/subtotal/tax/total_amount/down_payment` ke `placeholderValues` saat map body blocks di PDF proposal & contract.

### Batch C — Editor UI + wiring
Files:
- `src/components/documents/document-block-editor.tsx`
- `src/app/(app)/app/proposals/[proposalId]/edit/page.tsx`

Deliver:
- Tombol "Mulai dari template" di editor → reset `blocks` ke `buildProposalStarterBlocks()` (konfirmasi overwrite bila ada konten).
- Placeholder insert chips di panel Insert (klik sisip `{{client_name}}`, `{{total_amount}}`, `{{valid_until}}`, dsb. ke blok aktif / blok text baru).
- Preset "+ Pricing Table" (table dengan header + 1 baris contoh).
- `edit/page.tsx`: query proposal full + workspace, `buildProposalPlaceholderValues`, pass `placeholderValues` ke editor.

## Dependency & urutan

1. **Batch A dulu** (B & C import helper/key dari A).
2. Setelah A di-merge ke `dev/integration`, **B & C paralel** (file disjoint).

## Gate (per batch & saat integrasi)

- `npx tsc --noEmit`
- `npx vitest run <target tests>`
- `npm run build`
- `git diff --check`
- Commit + push branch feature. Integrator merge → combined gate → deploy dev via `scripts/operations/deploy-dev-integration.sh` → screenshot QA.

## Non-goals (jangan dikerjakan)

- Tidak ada schema/migration DB.
- Tidak mengubah billing/total/currency/status logic.
- Tidak deploy production (prod approval-gated).
- Tidak menambah block type baru / renderer signature baru.
