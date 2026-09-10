# Unified Files Grid Design

## Goal

Ubah halaman Files dari dua section terpisah (`Folders` dan `Files`) menjadi satu browser item ala Google Drive.

## Scope

- Satu toolbar untuk search, sort, dan Grid/List view.
- Satu koleksi gabungan untuk folder dan file.
- Folder selalu tampil sebelum file.
- Maksimal 10 item per halaman.
- Satu query pagination: `page`.
- Search mencari nama folder dan metadata file yang sudah didukung.
- Sort diterapkan di dalam masing-masing kelompok; folder tetap di atas file.
- Klik folder mempertahankan navigasi scope `clientId`, `projectId`, dan `folderId`.
- Action file, visibility, type, download, preview, dan delete tetap berfungsi.
- Empty state berlaku ketika hasil gabungan kosong.

## UI

```text
[Search items...] [Filter] [Sort] [Grid/List]

All items (N)
[Folder] [Folder] [File] [File]

[Previous] Page 1 / N [Next]
```

Grid dan List memakai satu urutan item yang sama. Folder dibedakan dengan ikon dan label jenis, bukan section terpisah.

## Data flow

1. Server page memuat semua folder dan file pada scope aktif.
2. Server meneruskan kedua koleksi utuh ke `FileList`.
3. `FileList` membentuk union item bertipe `folder` atau `file`.
4. Search/filter/sort dijalankan pada client.
5. Hasil folder dan file diurutkan terpisah, lalu digabung folder-first.
6. Koleksi gabungan dipaginasi per 10 item.

Server pagination `folderPage` dan `filePage` yang baru ditambahkan dihapus karena bertentangan dengan satu pagination gabungan.

## Compatibility

- URL lama dengan `folderPage`/`filePage` boleh diabaikan.
- Query baru memakai `page`.
- Breadcrumb dan soft folder navigation tetap sama.
- Tidak ada perubahan schema atau data.

## Verification

- Regression test membuktikan satu collection dan satu page state.
- Page 1 menampilkan maksimal 10 gabungan item.
- Folder selalu mendahului file.
- Search dapat menemukan folder dan file.
- Grid/List menghasilkan urutan yang sama.
- Pagination mempertahankan scope folder/client/project.
- ESLint, TypeScript, build, dan browser QA production harus PASS sebelum selesai.
