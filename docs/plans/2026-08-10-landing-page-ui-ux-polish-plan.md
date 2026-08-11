# Cubiqlo Landing Page Builder — UI/UX Polish Plan

**Tanggal:** 10 Agustus 2026
**Status:** Planning only — belum diimplementasi
**Target:** `dev.cubiqlo.com` lebih dulu
**Routes:** `/app/personal-site`, `/site/[slug]`, `/site/[slug]/[pageSlug]`
**Baseline QA:** `v0.1.124-dev`, akun owner `lostyoungsters@gmail.com`
**Production deploy:** Tidak termasuk. Butuh approval Alip setelah dev QA.

## 1. Tujuan

Merapikan canvas builder tanpa rewrite:

1. Editor lebih mudah dipahami user baru.
2. Bahasa Indonesia konsisten.
3. Error terlihat di section terkait, bukan hanya badge kecil.
4. Bottom bar tidak menutup panel atau canvas.
5. Landing publik bebas placeholder dan siap konversi.
6. Test browser mengikuti UI canvas aktif, bukan form builder lama.

## 2. Bukti Baseline

### Lulus

- Login owner: `200`.
- `/app/personal-site` terbuka tanpa console/page error.
- Insert block mengubah `3 sections` menjadi `4 sections`, status menjadi `Belum tersimpan`, dan tombol Simpan aktif.
- Preview Desktop, Tablet, Mobile bekerja.
- Preview privat `/site/alip?preview=1`: `200`.
- Public `/site/alip`: `200`.
- Tidak ada horizontal overflow: desktop `1440/1440`, mobile `375/375`.
- Test personal-site/site terarah: `121/121` lulus.
- Slug punya unique index DB.

### Temuan

1. UI campur bahasa Indonesia/Inggris.
2. Panel Insert panjang, padat, dan punya item terasa duplikat.
3. Block library/canvas bawah tertutup bottom status bar.
4. Badge `2 perlu diperbaiki` terlalu kecil dan tidak menunjuk section/field.
5. Site berstatus Live walau data tersimpan punya satu error CTA dan satu warning tema.
6. Public page masih memakai placeholder dan tujuan palsu:
   - `Tell clients what you do...`
   - `https://example.com/`
   - `mailto:hello@example.com`
7. Public renderer terlalu seragam; hierarchy dan social proof lemah.
8. `e2e/personal-site-v2.spec.ts` stale karena masih menguji form builder lama.

## 3. Non-Scope

- Tidak membuat full website builder baru.
- Tidak mengganti schema/migration kecuali implementasi menemukan blocker nyata.
- Tidak menambah dependency baru.
- Tidak deploy production.
- Tidak mengubah data production.
- Tidak menghapus route kompatibilitas lama pada batch ini.

## 4. Urutan Implementasi

## Phase P0 — Correctness dan publish safety

### P0.1 Validation terhubung ke canvas

**Target:** Error bisa ditemukan dan diperbaiki dari UI.

Aksi:

- Pisahkan severity `error` dan `warning` secara visual.
- Badge bottom bar menampilkan `1 error · 1 peringatan`.
- Klik validation item:
  1. pilih page terkait,
  2. scroll ke section/field,
  3. buka Properties panel,
  4. fokus input invalid.
- Section invalid mendapat outline merah; warning kuning.
- Input invalid memakai `aria-invalid`, `aria-describedby`, dan pesan inline.

Acceptance:

- Error CTA memfokuskan field CTA label/URL.
- Warning tema membuka tab Style.
- Tidak hanya mengandalkan warna; ada ikon dan teks severity.

### P0.2 Publish gate

**Target:** Draft invalid tidak mengganti versi publik yang sehat.

Aksi:

- Simpan draft tetap boleh saat error.
- Publish/perubahan Live diblokir saat `errorCount > 0`.
- Warning tidak memblokir publish, tapi butuh konfirmasi jelas.
- Jika site sudah Live lalu draft menjadi invalid, versi publik lama tetap tayang.
- Label status dibedakan:
  - `Tersimpan`
  - `Belum tersimpan`
  - `Draft belum siap dipublikasikan`
  - `Tayang`

Acceptance:

- CTA label tanpa URL tidak bisa dipublish.
- Existing public page tidak rusak akibat draft invalid.
- Pesan menjelaskan field yang perlu diperbaiki.

### P0.3 Placeholder readiness guard

**Target:** Template contoh tidak lolos sebagai konten publik tanpa peringatan.

Aksi:

- Deteksi nilai default berisiko: `example.com`, `hello@example.com`, instruksi template, testimonial/metric contoh.
- Kategorikan URL/email contoh sebagai error publish.
- Copy template generik menjadi warning readiness.
- Starter block tidak menyisipkan fake testimonial, logo, atau metric.

Acceptance:

- `https://example.com/` dan `hello@example.com` memblokir publish baru.
- Empty proof block boleh; fake proof tidak dibuat otomatis.

## Phase P1 — Editor information architecture

### P1.1 Tab dan istilah

Gunakan label Indonesia konsisten:

| Sekarang | Target |
|---|---|
| Insert | Blok |
| Style | Gaya |
| Structure | Struktur |
| Starter Blocks | Blok Siap Pakai |
| Section | Bagian |
| Live | Tayang |
| Preview | Pratinjau |
| Services | Layanan |
| Process | Proses Kerja |
| Pricing | Harga |
| Portfolio | Portofolio |

Aksi:

- Semua visible copy memakai registry i18n; jangan hardcode campur bahasa.
- Nama produk/loanword yang sengaja dipertahankan dicatat eksplisit.
- Tambah helper satu baris pada tiap tab.

Acceptance:

- Mode ID tidak menampilkan label editor Inggris kecuali nama brand/format teknis.
- Mode EN tetap lengkap dan tidak menampilkan label ID.

### P1.2 Blok vs preset

**Target:** Hilangkan daftar padat dan duplikasi konseptual.

Aksi minimum:

- Di tab Blok, pisahkan segmented control `Blok | Pola Siap Pakai`.
- `Blok`: primitive tunggal seperti Teks, CTA, FAQ, Galeri.
- `Pola Siap Pakai`: Layanan 3 Kartu, Proses 3 Langkah, Harga 3 Paket.
- Tambah search lokal tanpa dependency.
- Category dibuat collapsible; tampilkan category yang relevan dulu.
- Jangan menampilkan primitive dan preset bercampur dalam satu list.

Acceptance:

- `Layanan` dan `Layanan 3 Kartu` tidak terlihat sebagai dua pilihan setara tanpa konteks.
- Search menemukan nama Indonesia dan Inggris.
- Keyboard navigation dan focus state bekerja.

### P1.3 Canvas focus dan sidebar app

Aksi:

- Auto-collapse app sidebar saat editor dibuka pada desktop; user tetap bisa membuka lagi.
- Section aktif mendapat outline primary dan floating toolbar konsisten.
- `Upload hero image` menjadi empty-state action dengan ikon dan touch target minimal 44px.
- `Tambah Bagian` dibuat lebih terlihat tetapi tetap secondary.

Acceptance:

- Canvas mendapat ruang lebih besar.
- Selected section selalu jelas.
- Semua action section bisa dipakai keyboard.

## Phase P1.4 — Bottom toolbar

Susunan target:

```text
Kiri: Beranda / 3 bagian · status simpan
Tengah: Desktop | Tablet | Mobile · Undo · Redo
Kanan: 1 error · Pratinjau · Simpan · Status Tayang
```

Aksi:

- Tambah bottom padding pada panel Insert dan canvas setinggi toolbar + safe area.
- Toolbar tidak menutup content pada viewport pendek.
- `Status: Tayang` memakai control yang jelas, bukan badge/tombol ambigu.
- Pada mobile, gunakan dua baris atau overflow menu; Simpan tetap terlihat.

Acceptance:

- Item terakhir panel Blok dapat discroll penuh.
- Footer/canvas terakhir tidak tertutup.
- Touch target minimal 44px.
- Tidak ada overflow pada 320, 375, 768, dan 1440px.

## Phase P2 — Public landing conversion polish

### P2.1 Copy dan locale

- Public page mengikuti locale site secara konsisten.
- Hapus instruksi template dari output publik.
- CTA heading/body punya default netral bila kosong, bukan placeholder editorial.

### P2.2 Visual hierarchy

- Bedakan renderer per jenis section; jangan semua kartu putih seragam.
- Hero: headline lebih kuat, satu CTA utama, CTA kedua outline/link.
- Portfolio: tampilkan karya visual/card, bukan hanya tombol buta.
- Testimonials/logo hanya tampil bila user memasukkan data nyata.
- Kurangi vertical whitespace mobile tanpa mengorbankan readability.

### P2.3 Contact form accessibility

- Label terhubung ke input.
- Field wajib memakai `required` dan `aria-required` bila perlu.
- Border, placeholder, helper text memenuhi contrast.
- Success/error message diumumkan melalui live region.
- Honeypot tetap tidak terlihat pengguna/screen reader.

Acceptance P2:

- Public page 375px tanpa overflow.
- Satu CTA utama jelas.
- Tidak ada placeholder/example destination.
- Contact form bisa dipakai keyboard dan screen reader.

## Phase P3 — E2E dan regression gates

### P3.1 Tulis ulang Playwright canvas flow

Ganti selector/form flow stale dalam `e2e/personal-site-v2.spec.ts`.

Flow minimum:

1. Login owner dev.
2. Buka canvas editor.
3. Tambah primitive Teks.
4. Edit text melalui canvas/properties.
5. Verifikasi status dirty dan tombol Simpan.
6. Simpan draft.
7. Buat error CTA; publish harus diblokir.
8. Perbaiki CTA; publish berhasil.
9. Reload; data tetap sama.
10. Verifikasi public desktop/mobile.
11. Verifikasi CTA anonymous.
12. Unpublish; public route `404`.
13. Cleanup/restore fixture.

Gunakan slug khusus QA, bukan site `alip`.

### P3.2 Test tambahan

- Validation item fokus ke section/field benar.
- Placeholder destination memblokir publish.
- Warning-only flow bisa publish setelah confirmation.
- Mode ID dan EN tidak campur bahasa.
- Bottom toolbar tidak overlap panel/canvas.
- 320/375 mobile geometry.
- Missing/unpublished route `404`.
- Owner isolation dan slug collision tetap lulus.

### P3.3 Quality gates

```bash
npm run lint
npx tsc --noEmit
npx vitest run src/lib/personal-site src/app/site src/components/site
BASE_URL=https://dev.cubiqlo.com \
ALLOW_MUTATING_E2E=true \
PERSONAL_SITE_E2E_EMAIL=<qa-owner> \
PERSONAL_SITE_E2E_PASSWORD=<qa-password> \
npx playwright test e2e/personal-site-v2.spec.ts --project=chromium --workers=1 --retries=0
npm run build
```

## 5. File Map Awal

Audit dulu sebelum edit; kemungkinan area:

- `src/components/site/canvas/canvas-editor.tsx`
- `src/components/site/canvas/insert-panel.tsx`
- `src/components/site/canvas/properties-panel.tsx`
- `src/components/site/canvas/canvas-section.tsx`
- `src/components/site/canvas/canvas-renderer.tsx`
- `src/components/site/canvas/*toolbar*`
- `src/lib/personal-site/model.ts`
- `src/lib/personal-site/validation.ts` atau validator aktif
- `src/lib/actions/personal-site.ts`
- `src/app/site/[slug]/page.tsx`
- `src/components/site/personal-site-renderer.tsx`
- `e2e/personal-site-v2.spec.ts`

Smallest diff: gunakan komponen dan validator aktif; jangan hidupkan lagi form builder lama.

## 6. Release Strategy

1. Buat branch `polish/landing-builder-ui-ux-20260810` dari baseline terbaru.
2. Implement P0 terpisah dari cosmetic P1/P2 bila diff membesar.
3. Test + commit + push feature branch.
4. Handoff ke integration owner.
5. Merge ke `dev/integration`.
6. Combined gates.
7. Deploy hanya lewat `scripts/operations/deploy-dev-integration.sh` dan host `flock`.
8. QA desktop/mobile di `dev.cubiqlo.com`.
9. Production tetap HOLD sampai approval Alip.

## 7. Definition of Done

Plan selesai bila:

- [ ] Publish invalid diblokir tanpa menjatuhkan public version lama.
- [ ] Validation mengarah ke section/field.
- [ ] Placeholder/example destination tidak dapat dipublish.
- [ ] Tab, kategori, status, dan action konsisten sesuai locale.
- [ ] Blok dan pola siap pakai tidak bercampur.
- [ ] Search block tersedia.
- [ ] Bottom toolbar tidak overlap.
- [ ] Selected/error section jelas.
- [ ] Public page punya hierarchy dan CTA jelas.
- [ ] Public page bebas placeholder/fake proof.
- [ ] Contact form accessible.
- [ ] E2E canvas lifecycle lulus.
- [ ] Lint, typecheck, test, build lulus.
- [ ] Dev desktop/mobile QA lulus tanpa console error/overflow.
- [ ] Commit/push/handoff terdokumentasi.
- [ ] Production belum disentuh tanpa approval.

## 8. Estimasi

- P0 validation/publish/readiness: 1–1,5 hari.
- P1 editor IA/toolbar/locale: 1,5–2 hari.
- P2 public conversion/accessibility: 1–1,5 hari.
- P3 E2E + dev QA: 0,5–1 hari.

**Total:** sekitar 4–6 hari kerja, tergantung state validator dan renderer aktif.
