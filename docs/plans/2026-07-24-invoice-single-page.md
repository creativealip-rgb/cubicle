# Invoice Single-Page Creation Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Buat draft invoice lengkap dengan item manual/timesheet dan preview total dalam satu halaman.

**Architecture:** Perluas create server action dengan payload komposit dan transaksi atomik. Form client mengelola metadata, item, pilihan time entry, serta kalkulasi preview tanpa menyimpan state parsial.

**Tech Stack:** Next.js 16, React, TypeScript, Drizzle ORM, PostgreSQL, Vitest, Tailwind/shadcn.

---

### Task 1: Helper form invoice

**Files:**
- Create: `src/lib/invoice-create-form.ts`
- Test: `src/lib/invoice-create-form.test.ts`

**Steps:**
1. Tulis failing tests untuk due date +14 hari dan totals item.
2. Jalankan `npx vitest run src/lib/invoice-create-form.test.ts`; expected FAIL.
3. Implement helper murni.
4. Jalankan test; expected PASS.

### Task 2: Atomic create action

**Files:**
- Modify: `src/lib/actions/invoices.ts`

**Steps:**
1. Tambah schema payload items/timeEntryIds.
2. Validasi project terhadap client/workspace dan time entry eligible.
3. Bungkus insert invoice, item, update time entries, totals dalam `db.transaction`.
4. Pertahankan `createInvoice` lama untuk consumer existing; tambah `createInvoiceWithItems`.
5. Jalankan `npx tsc --noEmit`.

### Task 3: Load eligible timesheets

**Files:**
- Modify: `src/app/(app)/app/invoices/new/page.tsx`

**Steps:**
1. Query billable time entries belum invoiced dengan project metadata/rate.
2. Kirim data ringkas ke form.
3. Lokalisasi judul/subtitle/empty client state ke Bahasa Indonesia.

### Task 4: Single-page UI

**Files:**
- Modify: `src/components/forms/invoice-form.tsx`

**Steps:**
1. Tambah state item manual dan pilihan timesheet.
2. Reset project/timesheet saat client berubah.
3. Tambah auto due date +14 hari dan project currency inheritance.
4. Render editor item inline, selectable timesheets, subtotal real-time, advanced notes/terms.
5. Submit lewat `createInvoiceWithItems`; cegah invoice kosong.
6. Verify mobile layout dan loading state.

### Task 5: Verify and deploy

**Steps:**
1. `npx vitest run src/lib/invoice-create-form.test.ts src/lib/invoice-finance-rules.test.ts`
2. `npx tsc --noEmit`
3. `npm run build`
4. Browser QA create flow tanpa mengirim email.
5. Baca deploy guardrails, run pre-deploy check.
6. `docker compose build cubicle && docker compose up -d --no-deps cubicle`.
7. Verify health, container, 80/443 owner, target domain, unrelated domain.
