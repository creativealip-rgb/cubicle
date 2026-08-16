# Plan — Konsistensi Styling Tombol Header (Primary CTA)

**Tanggal:** 2026-08-17
**Scope:** Samakan styling semua tombol "create/add" di header halaman (font, tinggi, gap icon↔teks, radius). Warna tetap sesuai halaman masing-masing.
**Branch:** `main` (di `/root/projects/cubicle`)

---

## 1. Konteks & Akar Masalah

Komponen dasar `src/components/ui/button.tsx` punya dua properti kunci:

```
base: "inline-flex items-center justify-center gap-2 ... rounded-xl text-sm ... [&_svg]:size-4 ..."
size.sm: "h-8 rounded-lg px-3 text-xs"
```

Dua implikasi penting:

1. **`gap-2` (8px) adalah default** untuk SEMUA tombol. Tombol primary yang "benar" (New Project, New Client, dst.) justru **override eksplisit `gap-1` (4px)**. Jadi konsistensi dicapai dengan menambahkan `gap-1`, bukan menghapus `gap-2` dari base.
2. **`[&_svg]:size-4` memaksa semua icon SVG jadi 16px** (specificity selector `.parent svg` mengalahkan kelas `h-3`/`w-3` pada elemen svg). Artinya icon yang ditulis `h-3 w-3` sebenarnya **sudah render 16px** — ini dead code, bukan bug visual.

### Standar target (tombol primary create di header)
- Tinggi: **32px** (`h-8` dari `size="sm"`)
- Font: **12px** (`text-xs`), weight **400** (`font-normal`)
- Radius: **12px** (`rounded-lg`)
- Gap icon↔teks: **4px** (`gap-1`)
- Icon: **16px** (otomatis via `[&_svg]:size-4`)
- Warna: **tetap per halaman** (unggu `#6647F0` untuk default, putih/outline untuk yang memang outline)

---

## 2. Daftar Perubahan (5 file)

### A. Bug nyata — mengubah hasil render

**A1. Invoices — "New Invoice"** (`src/app/(app)/app/invoices/page.tsx:391`)
- Gap 8px → 4px.
- BEFORE: `<Button size="sm" className="w-full gap-2 sm:w-auto">`
- AFTER:  `<Button size="sm" className="w-full gap-1 sm:w-auto">`
- Warna: ungu (default), tidak berubah.

**A2. Time — "Log Time"** (`src/components/time/add-time-log-dialog.tsx:116`)
- Gap 8px → 4px; tinggi desktop 36px → 32px. Tinggi mobile `h-11` (44px, touch target) DIJAGA.
- BEFORE: `<DialogTrigger asChild><Button className="h-11 w-full gap-2 sm:h-9 sm:w-auto"><Plus className="h-4 w-4" />{t("Catat Waktu", "Log Time")}</Button></DialogTrigger>`
- AFTER:  `<DialogTrigger asChild><Button className="h-11 w-full gap-1 sm:h-8 sm:w-auto"><Plus className="h-4 w-4" />{t("Catat Waktu", "Log Time")}</Button></DialogTrigger>`
- Warna: ungu (default), tidak berubah.

**A3. Time — "Start Timer"** (`src/components/time/new-timer-dialog.tsx:46`)
- Gap 8px → 4px; tinggi desktop 36px → 32px. Tinggi mobile `h-11` DIJAGA.
- Warna: **tetap `outline` (putih)** sesuai instruksi user ("warnanya tetap pake yang sekarang").
- BEFORE: `<Button variant="outline" className="h-11 w-full gap-2 sm:h-9 sm:w-auto" onClick={startEmptyTimer} disabled={loading}>`
- AFTER:  `<Button variant="outline" className="h-11 w-full gap-1 sm:h-8 sm:w-auto" onClick={startEmptyTimer} disabled={loading}>`

**A4. Expenses — "Add Expense"** (`src/app/(app)/app/expenses/page.tsx:344`)
- Hapus `min-h-10` (paksa 40px) → kembali ke `h-8` (32px) default `size="sm"`. Tambah `gap-1`.
- BEFORE: `triggerClassName="flex-1 sm:flex-none min-h-10"`
- AFTER:  `triggerClassName="flex-1 sm:flex-none gap-1"`
- Warna: ungu (default via `AddExpenseButton` `variant="default"`), tidak berubah.
- Catatan: pemakaian kedua `AddExpenseButton` di line 553 (empty state, `variant="outline"`) **tidak diubah** — konteks CTA sekunder, bukan tombol header.

### B. Dead code cleanup — TIDAK mengubah render (opsional, disertakan)

**B1. Activities — icon "Add"** (`src/components/activities/activity-catalog.tsx:193`)
- `<Plus className="h-3 w-3" />` → `<Plus className="h-4 w-4" />`
- Icon sudah render 16px karena `[&_svg]:size-4`; ini hanya menyamakan kode dengan niat (menghapus misleading `h-3`).

---

## 3. Dampak ke Test (vitest)

Test wiring yang membaca string source — wajib dicek:

| Test | Assert terkait | Dampak perubahan |
|------|----------------|------------------|
| `time-mobile-action-layout-wiring.test.ts:18-21` | `h-11 w-full`, `sm:h-`, `sm:w-auto` di 3 komponen time | **AMAN** — assert pakai prefix `sm:h-`; `sm:h-8` tetap lolos. `h-11 w-full` & `sm:w-auto` dipertahankan. |
| `time-manual-task-ui-wiring.test.ts` | baca `add-time-log-dialog.tsx` (isi non-className) | AMAN |
| `manual-time-create-edit-parity-wiring.test.ts` | baca `add-time-log-dialog.tsx` + `time-route-content.tsx` | AMAN |
| `billing-aware-waktu-phase1-wiring.test.ts` | baca manual + timer, assert `projectId` dsb | AMAN |
| `time-timer-task-ui-wiring.test.ts` | baca `new-timer-dialog.tsx` (isi non-className) | AMAN |

Tidak ada test yang assert `gap-2` / `min-h-10` / `sm:h-9` pada file target. **Tidak perlu ubah test.**

---

## 4. Urutan Eksekusi

1. Edit 5 file (A1–A4, B1) via `patch`.
2. `npx tsc --noEmit` — pastikan 0 error.
3. `npx eslint` pada 5 file — pastikan bersih.
4. `npx vitest run` pada test wiring time + invoices + expenses + activities — pastikan PASS.
5. Commit + push `main`.
6. Deploy prod (manual `docker run` recipe `cubiqlo-prod:sha-<full>`) — lihat `cubiqlo-vps-deploy`.
7. Browser QA: computed-style di Projects/Clients/Invoices/Tasks/Services/Packages/Expenses/Time — pastikan tinggi 32px & gap 4px seragam, warna per halaman terjaga.

---

## 5. Verifikasi (bukti acceptance)

- **Computed style** (bukan nebak): untuk tiap tombol target, ukur `height`, `gap` (via `column-gap`), `fontSize`, `borderRadius`.
- Screenshot tiap halaman header.
- Health + routing prod hijau pasca-deploy.

---

## 6. Rollback

Image lama sudah ter-capture (`cubiqlo-prod:sha-<previous>`). Jika perlu rollback: `docker rm -f cubiqlo-new-app-next && docker run ... cubiqlo-prod:sha-<previous>` dengan env yang sama (backup env ada di `/root/backups/cubiqlo/`).
