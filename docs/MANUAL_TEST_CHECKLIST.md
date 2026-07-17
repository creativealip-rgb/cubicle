# Cubiqlo Manual Test Checklist + Copy-Paste Data

**Live:** https://cubiqlo.com  
**Version target:** v0.1.38  
**Tanggal panduan:** 2026-07-17  
**Cara pakai:** login → ikuti urutan flow (A→Z) → copas data di setiap section → centang PASS/FAIL.

---

## 0. Akun login

### Opsi A — akun lu sendiri (paling aman)
- Email: akun Cubiqlo lu (contoh `lostyoungsters@gmail.com`)
- Password: password lu

### Opsi B — bikin akun QA baru (recommended biar data bersih)
Buka https://cubiqlo.com/signup

```
Nama: QA Cubiqlo Tester
Email: qa-cubiqlo-20260717@example.com
Password: QaCubiqlo!2026
```

Onboarding workspace name:
```
QA Studio Manual Test
```

### Opsi C — akun existing di DB (password mungkin beda)
| Email | Workspace | Catatan |
|---|---|---|
| `testuser@example.com` | Test User's Workspace | QA lama |
| `lostyoungsters@gmail.com` | Alip's Workspace / aaa | owner Alip |
| `myvaworld@gmail.com` | Mimi VA1's Workspace | client Mimi |

> Seed demo `owner@cubicle.test` **sudah dihapus** di production. Jangan expect password123 masih jalan.

---

## 1. Smoke pre-check (5 menit)

| # | Cek | URL | Expected | ☐ |
|---|---|---|---|---|
| 1.1 | Homepage | `/` | 200, landing load | |
| 1.2 | Login page | `/login` | form email+password | |
| 1.3 | Signup page | `/signup` | form daftar | |
| 1.4 | Privacy | `/privacy` | 200 | |
| 1.5 | Terms | `/terms` | 200 | |
| 1.6 | Health | `/api/health` | `{"status":"ok","db":"ok"}` | |
| 1.7 | Login sukses | `/app/dashboard` | KPI/dashboard render | |
| 1.8 | Logout | topbar | balik ke login/home | |
| 1.9 | Login gagal | password salah | error, tidak crash | |
| 1.10 | Forgot password | `/forgot-password` | form submit, no 500 | |

---

## 2. Urutan test (dependency-aware)

Kerjain **berurutan**. Entity belakangan butuh entity di atasnya.

```
Auth → Settings → Client → Project → Task → Time
     → File → Expense → Proposal → Questionnaire
     → Contract → Invoice → Payment → Portal
     → Booking → Calendar → Reports → AI/Templates
     → Personal/Notes/Journal → Billing
```

---

## 3. Settings workspace

**Path:** `/app/settings`

### Data copas
```
Nama workspace: QA Studio Manual Test
Billing name: PT QA Studio Indonesia
Billing email: billing@qastudio.test
Billing phone: 081234567890
Tax ID / NPWP: 10.0.0.1-012.000
Alamat billing:
Jl. Melawai Raya No. 12
Kebayoran Baru, Jakarta Selatan 12160
Default currency: IDR
Default hourly rate: 250000
Default tax rate: 11
Reply-to email: hello@qastudio.test
```

### Checklist
| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 3.1 | Simpan profil bisnis | toast sukses, data persist reload | |
| 3.2 | Upload logo | preview muncul | |
| 3.3 | Set currency IDR | rate/format Rp di app | |
| 3.4 | Set reply-to | tersimpan | |
| 3.5 | Booking slug | isi `qa-studio-test` → simpan | |

Booking slug copas:
```
qa-studio-test
```

Public booking URL nanti:
```
https://cubiqlo.com/booking/qa-studio-test
```

---

## 4. Client CRUD

**Path:** `/app/clients` → New

### Client 1 (utama — full flow)
```
Nama: Rina Prameswari
Perusahaan: Kopi Senja Roastery
Email: rina.prameswari@kopisenja.test
Telepon: 081298765432
Website: https://kopisenja.test
Alamat: Jl. Braga No. 45, Bandung 40111
Tags: branding, social, retainer
Internal notes: [INTERNAL] Budget Q3 45jt. Jangan share ke portal.
Portal slug: kopi-senja
Portal enabled: ON
```

### Client 2 (portal + multi project)
```
Nama: dr. Andi Harmoni
Perusahaan: Klinik Harmoni
Email: admin@klinikharmoni.test
Telepon: 0215550123
Website: https://klinikharmoni.test
Alamat: Jl. Kemang Raya No. 8, Jakarta Selatan
Tags: website, seo
Internal notes: [INTERNAL] Prefer email pagi. PIC design: Sinta.
Portal slug: klinik-harmoni
Portal enabled: ON
```

### Client 3 (inactive / inactive test)
```
Nama: Budi Santoso
Perusahaan: PT Awan Digital
Email: budi@awandigital.test
Telepon: 081311122233
Website: https://awandigital.test
Alamat: BSD City, Tangerang Selatan
Tags: consulting
Internal notes: [INTERNAL] Kontrak selesai 2025. Archive candidate.
Portal enabled: OFF
```

### Checklist
| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 4.1 | Create Client 1 | muncul di list | |
| 4.2 | Create Client 2 & 3 | list 3 clients | |
| 4.3 | Search `Kopi` | filter Client 1 | |
| 4.4 | Open detail Client 1 | data lengkap + notes | |
| 4.5 | Edit phone Client 1 → `081200011122` | persist | |
| 4.6 | Export PDF client | PDF download | |
| 4.7 | Export list clients | CSV/PDF OK | |
| 4.8 | Free plan limit (jika Free) | max 3 clients, CTA upgrade | |

---

## 5. Project

**Path:** `/app/projects` → New (atau dari client detail)

### Project A (client visible — portal test)
```
Client: Kopi Senja Roastery
Nama: Instagram Launch Campaign
Deskripsi: Soft launch brand Instagram + content calendar 30 hari untuk grand opening outlet Braga.
Status: active
Billing type: project
Currency: IDR
Budget: 18000000
Rate: (kosong)
Start: 2026-07-01
Due: 2026-08-15
Client visible: ON
```

### Project B (hidden internal)
```
Client: Kopi Senja Roastery
Nama: Brand Guideline Refresh
Deskripsi: Internal rework logo lockup + color system. Jangan tampil di portal client.
Status: active
Billing type: hours
Currency: IDR
Rate: 250000
Budget: 8000000
Start: 2026-07-10
Due: 2026-09-01
Client visible: OFF
```

### Project C
```
Client: Klinik Harmoni
Nama: Website Redesign
Deskripsi: Redesign website klinik + booking form + SEO on-page.
Status: active
Billing type: package
Currency: IDR
Budget: 35000000
Start: 2026-06-15
Due: 2026-09-30
Client visible: ON
```

### Checklist
| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 5.1 | Create Project A/B/C | list + detail OK | |
| 5.2 | Status → on_hold Project B | badge update | |
| 5.3 | Status → active lagi | OK | |
| 5.4 | Project timeline | activity feed ada | |
| 5.5 | Client detail shows linked projects | A+B di Kopi, C di Klinik | |

---

## 6. Task

**Path:** `/app/tasks` atau project detail

### Tasks Project A (copy satu-satu)
```
1) Title: Audit akun Instagram existing
   Status: done
   Priority: medium
   Due: 2026-07-05
   Description: Review bio, highlight, grid, competitor.

2) Title: Moodboard visual brand
   Status: review
   Priority: high
   Due: 2026-07-12
   Description: 3 arah visual: warm rustic, modern minimal, playful cafe.

3) Title: Content calendar 30 hari
   Status: in_progress
   Priority: high
   Due: 2026-07-20
   Description: Mix reel, carousel, story. Include CTA booking.

4) Title: Shoot assets outlet Braga
   Status: todo
   Priority: urgent
   Due: 2026-07-18
   Description: Foto produk + interior. Client visible.

5) Title: Internal cost tracking notes
   Status: todo
   Priority: low
   Due: 2026-07-25
   Description: [INTERNAL] Jangan share ke portal.
   Client visible: OFF (kalau ada toggle)
```

### Tasks Project C
```
1) Title: Sitemap + wireframe homepage
   Status: in_progress
   Priority: high
   Due: 2026-07-22

2) Title: Migrasi konten layanan
   Status: todo
   Priority: medium
   Due: 2026-08-01

3) Title: QA mobile responsive
   Status: todo
   Priority: high
   Due: 2026-08-20
```

### Checklist
| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 6.1 | Create 5+ tasks | kanban/list muncul | |
| 6.2 | Drag status todo → in_progress → review → done | persist | |
| 6.3 | Edit due date overdue (kemarin) | highlight overdue | |
| 6.4 | Filter by project / status | benar | |
| 6.5 | Assign task ke diri sendiri | assignee badge | |
| 6.6 | Comment internal di task | tersimpan | |
| 6.7 | Comment client-visible (kalau ada) | flag visibility | |

Comment copas:
```
Internal: Cek dulu palette dari Brand Guideline sebelum shoot.
Client: Moodboard v2 sudah siap direview. Mohon feedback sebelum Jumat.
```

---

## 7. Time tracking

**Path:** `/app/time`

### Manual entry 1
```
Project: Instagram Launch Campaign
Task: Content calendar 30 hari (opsional)
Description: Draft calendar week 1-2 + CTA mapping
Duration: 2 jam 30 menit (atau start/end)
Hourly rate: 250000
Billable: ON
Date: hari ini
```

### Manual entry 2
```
Project: Brand Guideline Refresh
Description: Internal logo lockup exploration
Duration: 1 jam 15 menit
Hourly rate: 250000
Billable: OFF
Date: kemarin
```

### Manual entry 3
```
Project: Website Redesign
Description: Wireframe homepage + layanan
Duration: 3 jam
Hourly rate: 300000
Billable: ON
Date: 2 hari lalu
```

### Checklist
| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 7.1 | Start timer → stop | entry tersimpan | |
| 7.2 | Manual create 3 entries | list OK | |
| 7.3 | Edit duration | total update | |
| 7.4 | Toggle billable | filter billable works | |
| 7.5 | Export CSV | file download | |
| 7.6 | Export PDF timesheet | PDF OK | |

---

## 8. Files

**Path:** `/app/files` atau project detail

### Upload set
Siapkan 3 file lokal dulu (boleh bikin di Notes/Word):
1. `brief-kopi-senja.pdf` (atau .txt rename)
2. `moodboard-v1.png` / jpg
3. `internal-cost.xlsx` / txt

### Checklist
| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 8.1 | Upload ke Project A, visibility **client** | success | |
| 8.2 | Upload ke Project A, visibility **internal** | success | |
| 8.3 | Download file | file utuh | |
| 8.4 | Rename / folder (kalau ada) | OK | |
| 8.5 | Delete 1 file | hilang list, no orphan crash | |
| 8.6 | Client portal hanya lihat client-visible | internal hidden | |

---

## 9. Expenses

**Path:** `/app/expenses`

### Category
```
1) Name: Software
   Color: #3B82F6

2) Name: Transport
   Color: #F59E0B

3) Name: Production
   Color: #10B981
```

### Expense 1
```
Amount: 459000
Currency: IDR
Date: 2026-07-10
Description: Adobe CC team plan Juli
Category: Software
Vendor: Adobe
Project: Instagram Launch Campaign
Client: Kopi Senja Roastery
Tax included: ON
Tax amount: 45900
```

### Expense 2
```
Amount: 185000
Currency: IDR
Date: 2026-07-12
Description: Grab ke outlet Braga shoot recce
Category: Transport
Vendor: Grab
Project: Instagram Launch Campaign
Client: Kopi Senja Roastery
Tax included: OFF
```

### Expense 3 (USD multi-currency)
```
Amount: 29
Currency: USD
Date: 2026-07-08
Description: Envato Elements monthly
Category: Software
Vendor: Envato
Project: Website Redesign
Client: Klinik Harmoni
Tax included: OFF
```

### Recurring (kalau UI ada)
```
Description: Internet studio
Amount: 450000
Currency: IDR
Frequency: monthly
Next date: 2026-08-01
Category: Software
Vendor: IndiHome
```

### Checklist
| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 9.1 | Create categories | tab kategori OK | |
| 9.2 | Create 3 expenses | list + KPI update | |
| 9.3 | Filter by category/date/client | benar | |
| 9.4 | Edit expense amount | KPI refresh | |
| 9.5 | Upload receipt | preview/link OK | |
| 9.6 | Export CSV | download | |
| 9.7 | Multi-currency display | IDR Rp + USD prefix, bukan `$` aneh | |
| 9.8 | Recurring create + generate now | entry generated | |

---

## 10. Questionnaire (intake)

**Path:** `/app/questionnaires` → New

```
Name: Brand Discovery Form — Kopi Senja
Description: Form brief awal sebelum kickoff branding & social.
```

Fields:
```
1) type: text
   label: Nama brand
   required: true
   placeholder: Contoh: Kopi Senja

2) type: textarea
   label: Ceritakan brand dalam 3 kalimat
   required: true

3) type: select
   label: Budget range
   required: true
   options: <10jt | 10-25jt | 25-50jt | >50jt

4) type: multiselect
   label: Channel prioritas
   options: Instagram | TikTok | Website | Offline

5) type: email
   label: Email PIC
   required: true

6) type: date
   label: Target launch
   required: false

7) type: url
   label: Link referensi visual
   required: false
```

### Public fill (buka link intake di incognito)
```
Nama brand: Kopi Senja Roastery
Cerita: Specialty coffee local-first. Target anak muda Bandung. Ingin keliatan warm & premium.
Budget range: 25-50jt
Channel: Instagram, Offline
Email PIC: rina.prameswari@kopisenja.test
Target launch: 2026-08-15
Link referensi: https://www.instagram.com/explore/
```

### Checklist
| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 10.1 | Create questionnaire | saved | |
| 10.2 | Generate/share public link | `/intake/[token]` 200 | |
| 10.3 | Submit dari incognito | success page | |
| 10.4 | Response muncul di admin | data lengkap | |
| 10.5 | Required validation | kosong ditolak | |

---

## 11. Proposal

**Path:** `/app/proposals` → New

```
Client: Kopi Senja Roastery
Title: Proposal Social Launch — Kopi Senja Braga
Currency: IDR
Tax rate: 11
Down payment %: 50
Valid until: 2026-08-01

Body:
Halo Rina,

Berikut proposal untuk soft launch Instagram + content production outlet Braga.
Scope mencakup strategy, production, dan publishing support 30 hari.

Line items:
1) Description: Brand audit + strategy deck
   Qty: 1
   Unit price: 3500000

2) Description: Content calendar 30 hari
   Qty: 1
   Unit price: 4500000

3) Description: Production 12 assets (foto/carousel/reel cutdown)
   Qty: 12
   Unit price: 350000

4) Description: Community management 30 hari
   Qty: 1
   Unit price: 4000000
```

Hitung kasar expected:
- Subtotal ≈ 3.5 + 4.5 + 4.2 + 4.0 = **16.2jt**
- Tax 11% ≈ **1.782jt**
- Total ≈ **17.982jt**
- DP 50% ≈ **8.991jt**

### Checklist
| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 11.1 | Create draft proposal | totals benar | |
| 11.2 | Edit line item | recalc total | |
| 11.3 | Send / share public link | `/proposal/[token]` | |
| 11.4 | Open public as client | title, items, total OK | |
| 11.5 | Accept proposal (public) | status accepted | |
| 11.6 | Decline path (boleh proposal ke-2) | status declined | |
| 11.7 | Convert to invoice (kalau ada) | invoice draft terbentuk | |

---

## 12. Contract

**Path:** `/app/contracts` + `/app/templates` / contract-templates

### Template body (copas)
```
PERJANJIAN JASA KREATIF

Pihak Pertama: {{workspace_name}}
Pihak Kedua: {{client_name}}

1. Ruang Lingkup
Pihak Pertama menyediakan jasa sesuai proposal berjudul "{{proposal_title}}".

2. Nilai Kontrak
Total nilai jasa: {{total}} (termasuk/excluding PPN sesuai invoice).

3. Jadwal
Pekerjaan dimulai {{start_date}} dan target selesai {{due_date}}.

4. Pembayaran
DP 50% sebelum kickoff. Pelunasan 50% sebelum serah terima final.

5. Revisi
Termasuk 2 putaran revisi mayor. Revisi tambahan ditagihkan terpisah.

6. Hak Kekayaan Intelektual
Final deliverable berpindah ke Klien setelah pelunasan penuh.

7. Kerahasiaan
Kedua belah pihak menjaga informasi rahasia selama dan 12 bulan setelah kontrak.

Ditandatangani secara elektronik sebagai persetujuan yang sah.
```

### Contract create
```
Title: Kontrak Social Launch — Kopi Senja
Client: Kopi Senja Roastery
Valid until: 2026-09-30
Body: (paste template di atas, sesuaikan)
```

### Public sign data
```
Signed name: Rina Prameswari
Signed email: rina.prameswari@kopisenja.test
```

### Checklist
| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 12.1 | Create contract template | saved di Template Center | |
| 12.2 | Create contract draft | body render | |
| 12.3 | Send contract | public `/contract/[token]` | |
| 12.4 | View as client | status viewed | |
| 12.5 | Sign | status signed, timestamp | |
| 12.6 | PDF download | PDF OK | |
| 12.7 | Decline path (kontrak 2) | declined | |
| 12.8 | Revoke sent contract | link mati | |

---

## 13. Invoice + payment

**Path:** `/app/invoices` → New

### Invoice 1 (dari time/project)
```
Client: Kopi Senja Roastery
Project: Instagram Launch Campaign
Issue date: 2026-07-17
Due date: 2026-07-31
Currency: IDR
Notes: Pembayaran via transfer BCA. Mohon konfirmasi setelah transfer.
Terms: Net 14. Keterlambatan >7 hari dikenai reminder otomatis.

Items:
1) Description: Brand audit + strategy deck
   Qty: 1
   Unit price: 3500000

2) Description: Content calendar 30 hari
   Qty: 1
   Unit price: 4500000

3) Description: Production assets (12 pcs)
   Qty: 12
   Unit price: 350000

Tax: 11
Discount: 0
```

### Invoice 2 (USD client test)
```
Client: Klinik Harmoni
Project: Website Redesign
Issue date: 2026-07-17
Due date: 2026-08-16
Currency: USD
Notes: International wire. Quote valid for 14 days.
Items:
1) Description: UX wireframes homepage + services
   Qty: 1
   Unit price: 450
2) Description: UI design system starter
   Qty: 1
   Unit price: 600
Tax: 0
```

### Payment record
```
Invoice 1 partial:
Amount: 9000000
Paid at: 2026-07-18
Method: Bank transfer BCA
Notes: DP 50% approx

Invoice 1 remaining:
Amount: (sisa total)
Paid at: 2026-07-25
Method: Bank transfer BCA
Notes: Pelunasan
```

### Checklist
| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 13.1 | Create draft invoice | number auto | |
| 13.2 | Add/edit items | subtotal/tax/total benar | |
| 13.3 | Import billable time (kalau ada) | line items masuk | |
| 13.4 | PDF preview/download | logo + IDR format | |
| 13.5 | Send / generate share link | `/invoice/[token]` | |
| 13.6 | Public invoice view | amount benar, English UI OK | |
| 13.7 | Record partial payment | status partial/paid logic | |
| 13.8 | Record full payment | status paid, KPI dashboard | |
| 13.9 | Manual remind | notif/email attempt, activity log | |
| 13.10 | Mark overdue (due date lampau) | badge overdue | |
| 13.11 | Cancel invoice | status cancelled | |
| 13.12 | Multi-currency invoice USD | format `USD 1,050.00` style | |

---

## 14. Client portal

**Path:** client detail → enable portal → copy token/slug link

Slug test:
```
https://cubiqlo.com/client-portal/<token-atau-slug>
```
Kalau slug enabled:
```
kopi-senja
klinik-harmoni
```

### Checklist
| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 14.1 | Open portal Client 1 | 200, brand/client name | |
| 14.2 | Project visible only clientVisible=true | Project A muncul, B tidak | |
| 14.3 | Files: hanya client-visible | internal hidden | |
| 14.4 | Invoices list/pdf | bisa dibuka | |
| 14.5 | Timeline client-safe | no internal notes leak | |
| 14.6 | Portal request submit | admin terima request | |
| 14.7 | Invalid token | 404 | |
| 14.8 | Disabled portal | tidak akses | |

Portal request copas:
```
Subject: Minta revisi highlight cover
Message: Halo, tolong update highlight cover pakai foto outlet terbaru. Deadline Jumat.
```

---

## 15. Booking + calendar

**Path:** Settings booking slug + `/app/calendar` + public `/booking/qa-studio-test`

### Availability (contoh)
```
Senin-Jumat: 09:00-12:00, 13:00-17:00
Sabtu: 09:00-12:00
Timezone: Asia/Jakarta
Slot duration: 30 menit
Buffer: 15 menit
```

### Public booking form
```
Name: Rina Prameswari
Email: rina.prameswari@kopisenja.test
Phone: 081298765432
Notes: Mau bahas final moodboard + jadwal shoot Braga.
Slot: pilih slot kosong terdekat
```

### Double-booking test
```
Booking 1: slot X
Booking 2: slot X yang sama (incognito/bed browser)
Expected: ditolak / slot hilang
```

### Checklist
| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 15.1 | Set availability rules | saved | |
| 15.2 | Public page load | slots muncul | |
| 15.3 | Create booking | confirmation | |
| 15.4 | Muncul di `/app/calendar` | appointment ada | |
| 15.5 | Double-book blocked | error/slot taken | |
| 15.6 | ICS download (kalau ada) | file .ics | |
| 15.7 | Cancel/reschedule (kalau ada) | calendar update | |

---

## 16. Reports + dashboard

**Path:** `/app/dashboard`, `/app/reports`

### Checklist
| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 16.1 | Dashboard KPI load | no NaN/blank crash | |
| 16.2 | Reports collection/AR | angka sinkron invoice | |
| 16.3 | Expense vs income | multi-currency jujur | |
| 16.4 | Cashflow / overdue risk | overdue invoice keliatan | |
| 16.5 | Filter range bulan ini | charts update | |

---

## 17. Templates center

**Path:** `/app/templates`, `/app/invoice-templates`, `/app/contract-templates`, proposal templates

### Invoice template
```
Name: Default IDR Invoice
Notes default: Terima kasih atas kepercayaannya.
Terms default: Net 14. Pembayaran ke rekening tertera.
```

### Proposal template
```
Name: Social Media Launch Template
Body: (reuse body proposal section 11)
```

### Checklist
| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 17.1 | Create/edit/delete template | CRUD OK | |
| 17.2 | Tab switch Proposal/Invoice/Contract | URL sync | |
| 17.3 | Apply template ke dokumen baru | prefill body/items | |

---

## 18. AI Assistant + Prompts

**Path:** `/app/brain` atau AI panel, `/app/prompts`

### Prompt chat copas
```
Ringkas task overdue saya minggu ini dan usulkan prioritas.
```
```
Buatkan draft reminder sopan untuk invoice Kopi Senja yang belum dibayar.
```
```
Berapa total expense Software bulan ini?
```

### Visual/prompt generator
```
Platform: Instagram
Tone: warm, premium, local Bandung
Offer: soft launch Kopi Senja Braga
CTA: reservasi tasting session
```

### Checklist
| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 18.1 | Chat load history | no 500 | |
| 18.2 | Ask workspace question | jawaban relevan / tool call | |
| 18.3 | Confirm action (mark task/reminder) | butuh confirm, tidak silent | |
| 18.4 | Prompt generator output | copyable text | |
| 18.5 | Free plan AI limit | 0 atau blocked + upgrade CTA | |
| 18.6 | Export conversation (kalau ada) | file/text | |

---

## 19. Personal notes / journal / packages / email / support

### Personal note (`/app/personal` atau notes)
```
Title: Follow up DP Kopi Senja
Body: WA Rina kalau DP belum masuk H+2 after invoice send.
Due: 2026-07-20
Recurrence: none
Notify 1d: ON
Pinned: ON
```

### Journal (`/app/journal`)
```
Title: Daily log 17 Jul
Body: Setup QA data Cubiqlo. Client Kopi + Klinik. Invoice draft ready.
```

### Package (`/app/packages`) — kalau dipakai
```
Name: Social Starter 30 Hari
Price: 15000000
Currency: IDR
Description: Strategy + 12 assets + 30 hari calendar
```

### Email suite (`/app/email`)
```
To: rina.prameswari@kopisenja.test
Subject: Invoice & next steps — Kopi Senja Launch
Body:
Halo Rina,

Invoice untuk tahap 1 sudah kami kirim. Mohon konfirmasi jika sudah diterima.
Kita bisa jadwalkan kickoff setelah DP masuk.

Terima kasih,
QA Studio
```

### Support ticket (`/app/support`)
```
Subject: [QA] Test ticket manual
Category: bug
Body: Ini ticket test manual Cubiqlo 17 Jul. Boleh di-close.
```

### Checklist
| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 19.1 | Create personal note + pin | list OK | |
| 19.2 | Journal create/edit | persist | |
| 19.3 | Package create | list | |
| 19.4 | Email draft/send | status sent/failed jelas | |
| 19.5 | Support ticket | created | |
| 19.6 | Personal site /site preview | page 200 (kalau enable) | |

---

## 20. Billing / plan upgrade

**Path:** `/app/billing`

### Checklist
| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 20.1 | Lihat plan current | Free/Solo/Team jelas | |
| 20.2 | CTA upgrade Solo/Team | checkout Pakasir QRIS | |
| 20.3 | Non-owner (kalau ada member) | upgrade disabled | |
| 20.4 | Same-plan upgrade blocked | error/guard | |
| 20.5 | Free client limit 3 | create client ke-4 ditolak | |

> Jangan bayar beneran kecuali sengaja sandbox. Cek UI + guard cukup untuk manual smoke.

---

## 21. Auth edge + security quick

| # | Aksi | Expected | ☐ |
|---|---|---|---|
| 21.1 | `/app/*` tanpa login | redirect login | |
| 21.2 | Viewer role read-only (kalau ada) | create/edit ditolak | |
| 21.3 | Workspace switcher | data isolated | |
| 21.4 | Portal token guess random | 404 | |
| 21.5 | Internal notes tidak bocor ke portal/PDF client | pass | |
| 21.6 | CSRF/basic: logout di tab A, action tab B | fail graceful | |

---

## 22. Mobile smoke (HP / DevTools 390px)

| # | Page | Expected | ☐ |
|---|---|---|---|
| 22.1 | Dashboard | no horizontal overflow parah | |
| 22.2 | Clients list/detail | tap targets OK | |
| 22.3 | Tasks board | scroll/usable | |
| 22.4 | Invoice create | form usable | |
| 22.5 | Expenses | KPI stack, bukan tabrakan | |
| 22.6 | Public invoice/proposal/portal | readable | |

---

## 23. Data set ringkas (1x copas master)

### Identitas bisnis
```
QA Studio Manual Test
PT QA Studio Indonesia
billing@qastudio.test
081234567890
10.0.0.1-012.000
Jl. Melawai Raya No. 12, Kebayoran Baru, Jakarta Selatan 12160
```

### Client utama
```
Rina Prameswari
Kopi Senja Roastery
rina.prameswari@kopisenja.test
081298765432
https://kopisenja.test
Jl. Braga No. 45, Bandung 40111
```

### Project utama
```
Instagram Launch Campaign
```

### Angka sering dipakai
```
Rate: 250000
Tax: 11
Budget project: 18000000
Invoice item strategy: 3500000
Invoice item calendar: 4500000
Invoice item asset: 350000 x 12
Expense Adobe: 459000
```

---

## 24. Skor akhir manual test

Isi setelah selesai:

| Area | Pass | Fail | Blocked | Notes |
|---|---:|---:|---:|---|
| Auth | | | | |
| Clients/Projects/Tasks | | | | |
| Time/Files | | | | |
| Expenses/Reports | | | | |
| Proposal/Contract/Questionnaire | | | | |
| Invoice/Payment/Portal | | | | |
| Booking/Calendar | | | | |
| AI/Templates | | | | |
| Personal/Email/Support | | | | |
| Billing/Mobile/Security | | | | |
| **TOTAL** | | | | |

**Definition of done manual QA**
- Happy path client → project → task → time → invoice → pay → portal = PASS
- Public links (invoice/proposal/contract/booking/intake) = PASS
- No critical 500 / data leak internal notes = PASS
- Multi-currency + PDF tidak rusak = PASS

---

## 25. Tips biar cepet

1. Pakai 2 browser: **Chrome logged-in admin** + **Incognito public client**.
2. Simpan semua public token di note:
   ```
   Portal:
   Proposal:
   Contract:
   Invoice:
   Intake:
   Booking: https://cubiqlo.com/booking/qa-studio-test
   ```
3. Test destructive (delete/cancel/revoke) di **entity copy**, bukan satu-satunya data bagus.
4. Kalau Free plan nyangkut limit, upgrade dulu atau hapus client dummy.
5. Catat bug format: `Page | Steps | Expected | Actual | Screenshot`.

---

## 26. Bug report template (copas)

```
Title: [Cubiqlo] ...
Severity: blocker / major / minor
Page URL:
Account:
Steps:
1.
2.
3.
Expected:
Actual:
Screenshot/video:
Console error:
Network failed request:
```
