# Contract Editor Enhancement Plan

**Tanggal:** 2026-08-16
**Branch:** `dev/integration` (base `3a35520`)
**Tujuan:** bawa contract editor setara proposal — starter template kontrak, placeholder chips khusus contract, template button untuk kedua kind.

---

## State saat ini (contract editor)

Yang SUDAH ada (dari proposal enhancement Batch A/B, terpakai juga di contract):
- `placeholderValues` SUDAH wired di `contracts/[contractId]/edit/page.tsx` → `buildContractPlaceholderValues({...})`.
- Financial keys (`today/subtotal/tax/total_amount/down_payment`) SUDAH ada di `buildContractPlaceholderValues` via `financialPlaceholderValues`.
- Table editable, alignment (`align`), scroll-to-block SUDAH ada di `document-block-editor.tsx`.

Yang BELUM (gap vs proposal):
1. `buildContractStarterBlocks()` — tidak ada di `document-blocks.ts`.
2. `applyStarterTemplate()` di editor hardcoded `buildProposalStarterBlocks()` — harus branch by `kind`.
3. Tombol "Mulai dari template", preset pricing, dan chips placeholder di-gate `kind === "proposal"` — contract tidak dapat akses.
4. Chips placeholder proposal-specific (`proposal_number`); contract butuh `contract_number` + `contract_date` + `workspace_address`.

## Perbedaan kontrak vs proposal

| Aspek | Proposal | Contract |
|---|---|---|
| Starter cover | "Proposal" | "Perjanjian Kerja" + nomor kontrak |
| Nomor | `{{proposal_number}}` | `{{contract_number}}` |
| Tanggal | `{{valid_until}}` | `{{contract_date}}` + `{{valid_until}}` |
| Blok signature | tidak | `signature` (contract punya) |
| Alamat | (opsional) | `{{workspace_address}}` (para pihak) |
| Pricing preset | "+ Pricing Table" | tidak perlu (starter sudah include table "Nilai Kontrak") |
| Image/attachment | ya | tidak (allowed map contract tidak include) |

## Kontrak interface (WAJIB persis)

### `buildContractStarterBlocks(): DocumentBlock[]` (di `src/lib/document-blocks.ts`)

Return array berurutan (id pakai `crypto.randomUUID()`):
1. heading lvl1 content "Perjanjian Kerja" align "center"
2. text content "{{workspace_name}}" align "center"
3. text content "No: {{contract_number}}" align "center"
4. divider
5. heading lvl2 content "Para Pihak"
6. text content "Pihak Pertama: {{workspace_name}}"
7. text content "Pihak Kedua: {{client_name}}"
8. heading lvl2 content "Latar Belakang"
9. text content ""
10. heading lvl2 content "Ruang Lingkup"
11. list items ["", "", ""] ordered false
12. heading lvl2 content "Nilai Kontrak"
13. table rows [["Item", "Qty", "Harga", "Jumlah"], ["", "", "", ""]]
14. heading lvl2 content "Jangka Waktu"
15. text content "Berlaku sejak {{contract_date}} sampai {{valid_until}}"
16. heading lvl2 content "Ketentuan Lain"
17. text content ""
18. signature (block `{ id, type: "signature" }`)

JANGAN ubah `buildProposalStarterBlocks()` / `defaultDocumentBlocks()`.

### Editor `applyStarterTemplate` (di `src/components/documents/document-block-editor.tsx`)

```ts
const starter = kind === "contract" ? buildContractStarterBlocks() : buildProposalStarterBlocks();
```

### Chips placeholder contract (list token di panel Insert, branch by kind)

- proposal (existing, tidak diubah): client_name, client_email, company_name, workspace_name, proposal_number, valid_until, today, total_amount, down_payment, subtotal, tax
- contract (baru): client_name, client_email, company_name, workspace_name, workspace_address, contract_number, contract_date, valid_until, today

---

## Scope & ownership batch

### Batch A — Data (lib murni)
File: `src/lib/document-blocks.ts` + test baru `src/lib/contract-starter-block-wiring.test.ts`
- `buildContractStarterBlocks()` persis kontrak.
- Test readFileSync: document-blocks.ts mengandung `buildContractStarterBlocks`, `"Perjanjian Kerja"`, `"contract_number"`, `"Nilai Kontrak"`; function menghasilkan block type `signature` dan `table`.

### Batch B — Editor UI + wiring
File: `src/components/documents/document-block-editor.tsx` + test baru `src/lib/contract-editor-template-wiring.test.ts`
- Import `buildContractStarterBlocks`.
- `applyStarterTemplate` branch by kind (kontrak di atas).
- Tombol "Mulai dari template" tampil untuk KEDUA kind (hapus gate `kind === "proposal"`), teks dialog konfirmasi digeneralisir (jangan hardcode "template proposal").
- Chips placeholder branch by kind (contract list di atas).
- Preset "+ Pricing Table" TETAP proposal-only (contract starter sudah include table).
- Test readFileSync: editor mengandung `buildContractStarterBlocks`, `contract_number`, `contract_date`, `workspace_address`; dan `applyStarterTemplate` branch by kind.

## Dependency & urutan
1. Batch A (lib) dan Batch B (editor) paralel — file disjoint.
2. Batch B TIDAK perlu gate tsc/build lokal (karena `buildContractStarterBlocks` hanya ada di branch A). B cukup: kode + `git diff --check` + test readFileSync (tanpa import lib) + commit + push.
3. Integrator merge A dulu → B, lalu combined gate (tsc/vitest/build) di dev/integration.

## Gate (integrator, setelah merge)
- `npx tsc --noEmit`
- `npx vitest run <test A> <test B> <test existing editor>`
- `npm run build`
- Deploy dev → screenshot QA.

## Non-goals
- Tidak ada migration DB.
- Tidak ubah `buildProposalPlaceholderValues` / `buildContractPlaceholderValues` / renderer / PDF.
- Tidak deploy production (prod approval-gated).
- Tidak tambah block type baru.
