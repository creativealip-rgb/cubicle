# Phase 6A Team Timesheet Design

## Scope

Phase 6A menambah dua tampilan read-only pada halaman `/app/time`:

1. **Hari ini** — timeline entri hari berjalan, urut kronologis, termasuk active timer.
2. **Mingguan** — grid Senin–Minggu dengan total per hari dan total minggu.

Approval lifecycle, copy previous week, period lock, dan reminder tidak termasuk slice ini.

## Architecture

- Server page mengambil entry workspace dalam jendela terbatas yang cukup untuk timeline dan navigasi minggu.
- Helper murni `team-timesheet.ts` menangani batas minggu, pengelompokan hari, durasi efektif, dan range label. Helper menerima `now` agar deterministic/testable.
- Komponen client `team-timesheet-view.tsx` mengelola mode `today|week` dan offset minggu tanpa mutation DB.
- Tampilan existing `Timesheet` tetap menjadi log/filter/editor. Phase 6A ditaruh sebelum log existing, jadi tidak mengubah edit/delete flow.

## Data rules

- Minggu dimulai Senin dan berakhir Minggu, berdasarkan timezone browser saat render.
- Closed timer memakai `durationMinutes`, fallback `manualMinutes`.
- Active timer dihitung dari `startTime` sampai `now`; paused timer berhenti di `pausedAt`.
- Entry tanpa timestamp valid tidak masuk timeline/grid.
- Workspace isolation tetap dilakukan query server existing.

## UI

### Hari ini

- Header mode switch `Hari ini` / `Mingguan`.
- Ringkasan total hari dan jumlah entry.
- Timeline ringkas: waktu, client/project, activity/task, description, durasi, status running/paused.
- Empty state bila hari ini kosong.

### Mingguan

- Tombol minggu sebelumnya, minggu ini, minggu berikutnya.
- Total minggu.
- Desktop: grid tujuh kolom.
- Mobile: stack tujuh hari; tidak ada horizontal overflow.
- Setiap hari menampilkan tanggal, total durasi, dan entry ringkas.

## Safety

- Read-only; tidak ada schema/migration/action baru.
- Existing pagination/filter/editor tidak diubah.
- Maksimum dataset server tetap dibatasi.

## Verification

- Unit tests helper: Monday boundary, Sunday boundary, active/paused duration, day grouping.
- Wiring test memastikan page mengirim active + closed entries ke view.
- `npm test`, `npm run lint`, `npm run build`.
- Smoke dev desktop dan mobile `/app/time`.
