# Client Meeting Approval and Calendar Sync Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Membuat workflow pengajuan meeting klien dengan aksi Setujui, Tolak, Ubah jadwal; appointment tunggal tampil di kalender Cubiqlo user dan portal klien serta tersinkron independen ke Google Calendar keduanya.

**Architecture:** `portal_requests` menyimpan state negosiasi waktu dan referensi appointment. Satu service transaksional membuat appointment secara idempotent. Satu tabel sync menyimpan status Google Calendar per target user/client. UI user dan portal memanggil server action yang selalu memvalidasi tenant dan state.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM, PostgreSQL, Vitest, Playwright.

---

### Task 1: Tambah schema workflow meeting dan calendar sync

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0045_meeting_request_workflow.sql`
- Test: `src/lib/meeting-request-schema-wiring.test.ts`

**Steps:**
1. Tulis test gagal untuk field meeting request, FK appointment, proposed user, dan tabel `appointment_calendar_syncs` beserta unique indexes.
2. Jalankan `npx vitest run src/lib/meeting-request-schema-wiring.test.ts`; pastikan FAIL.
3. Tambah schema nullable non-destruktif dan migration SQL.
4. Jalankan test, `npx tsc --noEmit`, dan `git diff --check`.
5. Commit `feat: add meeting request workflow schema`.

### Task 2: Tambah validasi jadwal dan state machine murni

**Files:**
- Create: `src/lib/meeting-schedule.ts`
- Test: `src/lib/meeting-schedule.test.ts`

**Steps:**
1. Test durasi 30/45/60/90/120, IANA timezone valid, future start, end calculation, transition state, dan half-open overlap.
2. Jalankan test dan pastikan FAIL.
3. Implement utility murni tanpa akses DB.
4. Jalankan test dan typecheck.
5. Commit `feat: validate meeting schedules and transitions`.

### Task 3: Buat service approval appointment idempotent

**Files:**
- Create: `src/lib/meeting-request-service.ts`
- Modify: `src/lib/actions/portal-requests.ts`
- Test: `src/lib/meeting-request-service-wiring.test.ts`

**Steps:**
1. Test wiring transaction, tenant scope, state guard, conflict query, appointment insert, conditional request update, dan retry existing appointment.
2. Pastikan test FAIL.
3. Implement service approval, reject, counter-propose, client accept, dan client resubmit.
4. Pastikan approval user memakai actor user; client acceptance memakai proposer user atau owner fallback.
5. Jalankan focused test, typecheck, lint.
6. Commit `feat: add meeting request approval service`.

### Task 4: Tambah sinkronisasi Google Calendar per target

**Files:**
- Create: `src/lib/appointment-calendar-sync.ts`
- Modify: `src/lib/google-calendar.ts`
- Modify: `src/lib/client-google-calendar.ts`
- Modify: `src/lib/actions/portal-requests.ts`
- Test: `src/lib/appointment-calendar-sync-wiring.test.ts`

**Steps:**
1. Test status pending/synced/failed/skipped dan unique upsert per target.
2. Pastikan test FAIL.
3. Implement sync user dan client secara independen setelah commit DB.
4. Pastikan satu kegagalan tidak menghalangi target lain dan retry tersedia hanya bagi workspace writer.
5. Jalankan focused test, typecheck, lint.
6. Commit `feat: sync approved meetings to both calendars`.

### Task 5: Upgrade form pengajuan meeting portal

**Files:**
- Modify: `src/components/portal/portal-action-buttons.tsx`
- Modify: `src/lib/actions/portal-requests.ts`
- Test: `src/lib/portal-meeting-request-form-wiring.test.ts`

**Steps:**
1. Test field wajib tanggal, jam, durasi, timezone, agenda dan daftar durasi.
2. Pastikan test FAIL.
3. Implement form mobile-safe, browser timezone default, submit ISO schedule terstruktur.
4. Tampilkan validation/error server tanpa menutup dialog.
5. Jalankan focused test, typecheck, lint, browser mobile.
6. Commit `feat: collect structured client meeting requests`.

### Task 6: Tambah aksi user Setujui, Tolak, Ubah jadwal

**Files:**
- Modify: `src/components/portal/portal-request-admin.tsx`
- Modify: `src/app/(app)/app/clients/[clientId]/page.tsx`
- Test: `src/lib/portal-meeting-admin-actions-wiring.test.ts`

**Steps:**
1. Test tiga aksi hanya tampil untuk meeting actionable; legacy tanpa waktu tidak bisa langsung disetujui; alasan penolakan wajib; reschedule wajib waktu lengkap.
2. Pastikan test FAIL.
3. Implement CTA dan dialog konfirmasi/form.
4. Refresh/revalidate data setelah mutation; tampilkan conflict/stale errors.
5. Jalankan focused test, typecheck, lint, visual desktop/mobile.
6. Commit `feat: add meeting approval actions for users`.

### Task 7: Tambah respons counterproposal dan kalender portal klien

**Files:**
- Modify: `src/components/portal/portal-request-list.tsx`
- Modify: `src/app/client-portal/[token]/page.tsx`
- Create: `src/components/portal/portal-appointments.tsx`
- Test: `src/lib/portal-client-meeting-workflow-wiring.test.ts`

**Steps:**
1. Test client hanya melihat Setujui jadwal/Ajukan ulang saat `counter_proposed` dan appointment approved tampil di portal.
2. Pastikan test FAIL.
3. Implement actions token-scoped, upcoming/past appointment views, timezone/duration/status, `.ics` link.
4. Pastikan approved/rejected masuk history dan non-meeting request tidak berubah.
5. Jalankan focused test, typecheck, lint, visual mobile.
6. Commit `feat: show meeting workflow in client portal`.

### Task 8: Notifikasi dan status sync

**Files:**
- Modify: `src/lib/notifications.ts`
- Modify: `src/lib/in-app-notifications.ts`
- Modify: `src/components/portal/portal-request-admin.tsx`
- Modify: `src/components/portal/portal-request-list.tsx`
- Test: `src/lib/meeting-notification-wiring.test.ts`

**Steps:**
1. Test event approval/rejection/counterproposal/client acceptance/resubmit/sync failure.
2. Pastikan test FAIL.
3. Implement notifikasi best-effort dan badge status sync user/client.
4. Tambah retry sync untuk user; klien tidak boleh retry target user.
5. Jalankan focused test, typecheck, lint.
6. Commit `feat: notify meeting workflow and sync status`.

### Task 9: Integrasi dan E2E

**Files:**
- Create: `e2e/client-meeting-workflow.spec.ts`
- Modify tests bila ditemukan bug regresi.

**Steps:**
1. Apply migration ke DB development saja.
2. Seed request meeting test non-destruktif.
3. Jalankan submit, approve, DB count=1, retry approve count tetap 1, user calendar, portal calendar, reject, counterproposal, client acceptance.
4. Verifikasi Google target `synced` bila koneksi tersedia atau `skipped` eksplisit bila tidak.
5. Jalankan `npx vitest run`, `npx tsc --noEmit`, ESLint file terkait, build, dan Playwright.
6. Jalankan `git diff --check` dan review security/tenant boundaries.
7. Commit fix integrasi bila ada, lalu push branch.

## Final Verification

```bash
npx vitest run
npx tsc --noEmit
npx eslint --max-warnings=0 <all changed ts/tsx files>
npm run build
git diff --check
git status --short --branch
```

Acceptance gate: semua kriteria pada `docs/superpowers/specs/2026-07-26-client-meeting-approval-calendar-sync-design.md` terbukti lewat test atau browser/DB evidence.