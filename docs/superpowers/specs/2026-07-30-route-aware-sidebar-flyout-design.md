# Route-Aware Sidebar Flyout

## Goal

Desktop sidebar otomatis membuka flyout grup yang memiliki route aktif. Pengguna langsung melihat lokasi submenu saat berada di Klien, Proyek, Tugas, Keuangan, Personal, atau AI.

## Behavior

- Sidebar desktop expanded:
  - route child aktif otomatis membuka flyout parent;
  - pindah ke child grup lain otomatis membuka grup baru;
  - pengguna boleh menutup flyout aktif lewat klik parent;
  - hover grup lain tetap membuka preview sementara;
  - selesai hover kembali ke grup route aktif jika tidak dipin manual.
- Sidebar desktop collapsed tetap memakai flyout terposisi di samping ikon.
- Mobile tetap accordion inline dan otomatis membuka grup route aktif.
- Direct routes seperti Dashboard, Waktu, Kalender, dan File tidak memaksa flyout grup.
- Child aktif tetap memiliki `aria-current="page"`; parent memakai `aria-expanded` sesuai flyout nyata.
- Chevron mengarah ke bawah saat flyout parent terbuka dan ke kanan saat tertutup.

## State Model

- `active.groupId`: grup dari pathname, sumber default.
- `pinned`: override manual dari klik parent.
- `hovered`: preview sementara.
- Effective open group desktop expanded: `hovered ?? pinned ?? active.groupId`.
- Manual close parent aktif memakai sentinel state agar default route-open bisa dioverride sampai pathname berubah.
- Perubahan pathname mereset override dan membuka grup route baru.

## Scope

File utama:
- `src/components/sidebar/sidebar-navigation.tsx`
- regression test baru di `src/lib/` atau dekat komponen.

Tidak mengubah struktur navigasi, route, badge, permission, atau mobile layout.

## Tests

Regression test mengunci:
- active route menjadi fallback open group;
- manual close override tersedia;
- pathname change mereset override;
- chevron mengikuti expanded state;
- mobile behavior tetap route-aware.

Verification:
- focused test RED/GREEN;
- full Vitest;
- lint;
- production build;
- authenticated browser QA untuk Klien, Proyek, Tugas, Keuangan, Personal, AI pada desktop dan mobile.
