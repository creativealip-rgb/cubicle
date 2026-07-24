# Multi-Project Invoice Implementation Plan

> **For Hermes:** Execute task-by-task using strict TDD and preserve unrelated working-tree changes.

**Goal:** Pilih beberapa proyek dari satu klien, otomatis buat item invoice, dan konversi nominal dengan kurs manual workspace.

**Architecture:** Tambah helper konversi cross-currency dan resolver nominal proyek. Page memuat project/package/rates lengkap; form mengelola multi-selection dan preview. Server menerima project IDs, menghitung ulang nominal dan FX, lalu menyimpan project/time/manual items atomik.

**Tech Stack:** Next.js 16, React, TypeScript, Drizzle/PostgreSQL, Vitest.

---

### Task 1: FX conversion helper
**Files:** Modify `src/lib/currency-base.ts`; create `src/lib/invoice-project-items.test.ts`; create `src/lib/invoice-project-items.ts`.
1. Tulis failing tests same/base/foreign/cross/missing rate dan nominal billing.
2. Jalankan focused test, pastikan RED.
3. Implement helper minimal.
4. Jalankan focused test, pastikan GREEN.

### Task 2: Audit-safe invoice item schema
**Files:** Modify `src/db/schema.ts`; create `drizzle/0038_invoice_project_fx_items.sql`.
1. Tambah enum source `project` dan kolom original currency/amount serta conversion rate.
2. Buat migrasi idempotent-compatible PostgreSQL.
3. Jalankan schema/type check.

### Task 3: Server atomic creation
**Files:** Modify `src/lib/actions/invoices.ts`.
1. Ubah payload menjadi `projectIds`, manual items, dan time source IDs.
2. Reject duplicate projects/time entries.
3. Resolve workspace rates, project/package nominal, dan conversion server-side.
4. Insert semua item dan update timesheets dalam transaksi existing.
5. Hitung subtotal/tax/total dari converted values.

### Task 4: Data loader and multi-project UI
**Files:** Modify `src/app/(app)/app/invoices/new/page.tsx`, `src/components/forms/invoice-form.tsx`.
1. Muat workspace base currency, rates, budget/rate/package price.
2. Ganti project single select menjadi checklist multi-select.
3. Buat auto rows dan FX preview; blok missing rate dengan link Settings.
4. Filter timesheet dari seluruh selected projects.
5. Pertahankan item manual sebagai opsi.

### Task 5: Verification and deployment
1. Focused/full tests, typecheck, build.
2. Apply migration through project migration command.
3. Read deploy guardrails and run pre-deploy check.
4. Rebuild/restart app without public port changes.
5. Verify health, container, target domain, unrelated domain, and mobile UI.
