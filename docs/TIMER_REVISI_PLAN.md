# Plan Revisi Timer Cubiqlo

**Tanggal:** 2026-07-21  
**Scope:** Quick timer navbar + align timer page + riwayat edit  
**Status cek path:** live code di `/root/projects/cubicle` (bukan asumsi)

---

## Ringkasan status

| Area | Status | Catatan |
|------|--------|---------|
| Backend start kosong | **DONE** | `startTimer` optional client/project |
| Backend pause/resume | **DONE** | `pauseTimer` / `resumeTimer` + `pausedAt` |
| Backend stop form | **DONE** | `stopTimerSchema` wajib client/project/task/desc |
| Backend update entry | **DONE** (server) | `updateTimeEntry` ada; UI belum |
| API active timer | **DONE** | `/api/time/active` kirim `pausedAt` + options |
| Navbar start kosong | **DONE** | `startTimer({ workspaceId })` |
| Navbar pause/resume/stop | **DONE** | wired + `StopTimerDialog` |
| Navbar elapsed pause-aware | **DONE** | `formatElapsed(start, pausedAt)` |
| Timer widget start kosong | **BELUM** | masih wajib client+project |
| Timer widget pause/resume | **BELUM** | tidak ada |
| Timer widget stop form | **BELUM** | stop langsung `stopTimer(id)` |
| Timer widget pause-aware | **BELUM** | elapsed & event listener ketinggalan |
| Riwayat edit timesheet | **BELUM** | hanya delete |
| Verify tsc/lint | **BELUM** | belum dijalankan sesi ini |
| Update log/docs | **BELUM** | file plan ini baru |

---

## Target UX (kesepakatan)

1. **Start cepat dari navbar** → timer kosong (tanpa client/project dulu).
2. **Pause / resume** dari navbar saat timer aktif.
3. **Stop** lewat form: client + project + **task wajib** + **deskripsi wajib**.
4. **Halaman `/app/time` (timer-widget)** selaras flow navbar (bukan model lama).
5. **Riwayat timesheet** bisa edit entri lewat `updateTimeEntry` (bukan cuma hapus).

---

## Path & status detail

### A. Backend / actions — `src/lib/actions/time.ts`

| Item | Status | Bukti |
|------|--------|-------|
| `startTimerSchema` client/project optional | **DONE** | L53–62: optional/nullable |
| Auto-close open timer (incl. paused) | **DONE** | L122–146: end di `pausedAt ?? now` |
| `pauseTimer` | **DONE** | L188+ set `pausedAt` |
| `resumeTimer` | **DONE** | L225+ geser `startTime` by pause duration, clear `pausedAt` |
| `stopTimer` form wajib | **DONE** | `stopTimerSchema` L90–98 task+desc required |
| `updateTimeEntry` | **DONE** server | L376–411; field desc/tags/client/project/task/start/end/manual/billable/status |
| `deleteTimeEntry` | **DONE** | L414+ |

**Sisa backend (opsional polish):**
- [ ] Pastikan `getActiveTimer` selalu expose field yang UI butuh (pausedAt, tags jika stop prefill tags).
- [ ] Guard `updateTimeEntry` terhadap entry `invoiced` / status locked (kalau belum).
- [ ] Return shape `startTimer`/`pause`/`resume` konsisten `{ ok, error? }` (navbar sudah consume `.ok`).

### B. API — `src/app/api/time/active/route.ts`

| Item | Status |
|------|--------|
| Auth + workspace | **DONE** |
| `activeTimer` + `pausedAt` | **DONE** |
| `options` clients/projects/tasks | **DONE** |

**Sisa:**
- [ ] Optional: sertakan `tags` di activeTimer untuk prefill stop form.

### C. Navbar — `src/components/app-topbar.tsx`

| Item | Status |
|------|--------|
| Fetch `/api/time/active` + poll 15s + event `cubicle:timer-changed` | **DONE** |
| Load options stop form | **DONE** |
| Start empty | **DONE** (`handleStartTimer`) |
| Pause / Resume | **DONE** |
| Stop → `StopTimerDialog` | **DONE** |
| UI label “Mulai timer kosong” / “Jeda” / “Lanjut” | **DONE** |
| Elapsed freeze saat pause | **DONE** |
| Mobile: tombol timer hidden saat idle (`hidden md:inline-flex`) | **DONE** (by design) |

**Sisa navbar (kecil):**
- [ ] Setelah stop sukses: pastikan `onStopped` clear state + toast (cek L715+ wiring).
- [ ] Prefill tags di dialog jika API tambah tags.
- [ ] Disable double-submit sudah ada `timerBusy` — keep.

### D. Stop form — `src/components/time/stop-timer-dialog.tsx`

| Item | Status |
|------|--------|
| Dialog + cascade client→project→task | **DONE** |
| Validasi client/project/task/desc | **DONE** |
| Call `stopTimer` + rate hourly project | **DONE** (form path) |
| Reusable dari navbar | **DONE** |

**Sisa:**
- [ ] Reuse dialog dari **timer-widget** (belum).
- [ ] Optional: discard stale tanpa form (navbar/widget stale path).

### E. Timer page widget — `src/components/time/timer-widget.tsx`

| Item | Status | Gap |
|------|--------|-----|
| Start | **BELUM** align | Masih wajib client+project L167–169 |
| Stop | **BELUM** align | Langsung `stopTimer(activeTimer.id)` L210–214 — **tidak** lewat form (dan signature backend sekarang butuh payload form → risk runtime error) |
| Pause/resume | **BELUM** | Tidak import/handle |
| `pausedAt` di type/elapsed | **BELUM** | `formatElapsed` cuma startTime; tick tetap jalan meski pause |
| Event sync | **PARSIAL** | Listener L141–154 **null-kan** timer saja, tidak reload active timer dari server |
| Stale discard | **ADA** | `handleDiscard` lewat stop id-only — perlu cek kompatibel stop schema baru |

**Plan align widget (task 4c2):**
1. Izinkan **Start kosong** (tombol secondary “Mulai kosong”) + keep start dengan form terisi.
2. Active state: tombol **Jeda / Lanjut** + **Hentikan** buka `StopTimerDialog`.
3. Type `ActiveTimer` + `pausedAt`; elapsed freeze saat pause.
4. Event `cubicle:timer-changed`: **refetch** active timer (bukan hard null), kecuali self-dispatch stop.
5. Hapus/stop path id-only; semua stop complete lewat form; discard terpisah kalau masih perlu (server action discard?).

### F. Riwayat timesheet — `src/components/time/timesheet.tsx`

| Item | Status |
|------|--------|
| List + filter + pagination | **DONE** |
| Delete | **DONE** (`deleteTimeEntry`) |
| Edit via `updateTimeEntry` | **BELUM** — no import, no edit UI |

**Plan edit (task 4c3):**
1. Tombol Edit per row → dialog/sheet.
2. Field: description, tags, client, project, task, start/end atau manual minutes, billable, status (draft/approved; lock invoiced).
3. Call `updateTimeEntry(id, payload)` + `router.refresh()`.
4. Optional: inline edit description only dulu (MVP), full form v2.

### G. Verify / docs

| Item | Status |
|------|--------|
| `tsc` / lint path timer | **BELUM** |
| Manual smoke start→pause→resume→stop form | **BELUM** (sesi ini) |
| Update `feature-status` / changelog | **BELUM** |
| File plan ini | **DONE** (baru) |

---

## Urutan kerja sisa (prioritas)

### P0 — Fix risiko bug widget vs schema baru
Widget stop masih `stopTimer(id)`. Backend `stopTimer` sekarang butuh object form. **Path time page bisa broken.**

1. Wire `StopTimerDialog` di timer-widget.
2. Ganti `handleStop` → open dialog.
3. Smoke stop dari `/app/time`.

### P1 — Align timer-widget (task 4c2)
1. Start kosong.
2. Pause/resume + pause-aware elapsed.
3. Refetch on `cubicle:timer-changed`.
4. Types nullable client/project untuk empty timer.

### P2 — Riwayat edit (task 4c3)
1. Edit dialog + `updateTimeEntry`.
2. Guard status invoiced.
3. Refresh list.

### P3 — Hardening
1. `tsc --noEmit` + lint file timer.
2. E2E/manual checklist update (`MANUAL_TEST_CHECKLIST` section time).
3. Docs UX: quick timer empty → fill on stop.

---

## Saran (bukan blocker, tapi worth)

1. **Satu sumber kontrol timer**  
   Extract hook `useActiveTimer()` (fetch, poll, pause/resume/start, events) dipakai topbar + widget. Kurangi drift formatElapsed / event handling.

2. **Stop form = single component**  
   Sudah ada `StopTimerDialog` — jangan duplikasi form di widget.

3. **Empty timer visibility**  
   Navbar label “Timer kosong” sudah ada. Di widget, tampilkan badge “Belum diisi” + CTA “Lengkapi saat stop”.

4. **Pause model**  
   Resume menggeser `startTime` (pause duration di-exclude). Pastikan export CSV / durationMinutes konsisten (stop pakai end-start setelah shift). Worth unit test pure duration helper.

5. **Riwayat edit MVP**  
   Prioritas field yang sering salah: description, project/task, billable, duration. Jangan full admin form dulu.

6. **Mobile**  
   Idle timer hidden di phone OK; pastikan running/paused tetap kelihatan (sudah: hidden hanya saat `!activeTimer`).

7. **Discard stale**  
   Pisah action `discardTimer(entryId)` yang delete open entry tanpa wajib form — lebih aman daripada reuse `stopTimer` id-only.

8. **Options cache**  
   Topbar load full clients/projects/tasks tiap poll 15s agak berat. Poll timer state saja; options load on open stop dialog / first mount.

---

## Checklist eksekusi singkat

- [x] Backend start kosong + pause/resume + stop schema
- [x] API active + options
- [x] Navbar wire start/pause/resume/stop form
- [x] `StopTimerDialog` component
- [ ] Timer-widget: stop form (P0)
- [ ] Timer-widget: start kosong + pause/resume + elapsed (P1)
- [ ] Timesheet: edit UI `updateTimeEntry` (P2)
- [ ] tsc/lint + smoke (P3)
- [ ] Changelog / feature-status (P3)

---

## File kunci

```
src/lib/actions/time.ts
src/app/api/time/active/route.ts
src/components/app-topbar.tsx
src/components/time/stop-timer-dialog.tsx
src/components/time/timer-widget.tsx      ← gap utama
src/components/time/timesheet.tsx         ← edit belum
docs/TIMER_REVISI_PLAN.md                 ← file ini
```

## Definisi “selesai total”

1. Navbar: start kosong → pause → resume → stop form → entry tersimpan lengkap.  
2. `/app/time`: behavior sama; tidak ada stop id-only.  
3. Timesheet: edit entri non-invoiced berhasil.  
4. `tsc` bersih di path terkait.  
5. Docs/checklist time ter-update.

---

*Generated from live path check 2026-07-21. Update status baris checklist saat tiap item merge.*
