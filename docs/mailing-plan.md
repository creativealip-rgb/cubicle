# Mailing Plan: PremiAcc + Cubicle pakai mail.nggawe.web.id

**Tanggal:** 2026-06-16
**Author:** Coder
**Status:** Draft — menunggu approval Alip

---

## 1. Pertanyaan awal

> Apakah `mail.nggawe.web.id` berfungsi untuk kirim & terima email keluar?

**Jawaban: BELUM.** Hasil test 2026-06-16:

| Fungsi | Status | Alasan |
|---|---|---|
| Webmail UI | ✅ Hidup | Vue SPA serve via CF Worker `cloud-mail` |
| Receive `*@mail.contenly.app` | ❌ Salah target | CF rule forward ke `lostyoungsters@gmail.com`, bukan ke Worker |
| Receive `*@mail.nggawe.web.id` | ⚠️ Partial | 12 rule per-user (admin/budi/cahyo/...) forward ke Worker, tapi Worker DB sudah pindah ke `contenly.app` jadi data user nggawe jadi orphan |
| Receive `*@premiacc.web.id` | ❌ Belum | Belum ada CF Email Routing rule |
| Receive `*@cubicle.web.id` | ❌ Belum | Belum ada CF Email Routing rule |
| Send dari webmail | ❌ Off | `setting.send=0`, `resend_tokens="{}"`, Worker gak ada Resend binding |
| Send via SMTP/IMAP | ❌ Tidak ada | Worker only serves HTTP, no SMTP/LMTP |

**Kesimpulan:** `mail.nggawe.web.id` saat ini cuma **webmail viewer** untuk receive — gak bisa kirim dari webmail, dan integration dengan PremiAcc/Cubicle belum ada.

---

## 2. Konteks dua project

### PremiAcc (`/root/projects/premiacc`)
- Stack: Next.js 16 + Better Auth + Drizzle + Postgres
- Live: `https://premiacc.168-144-37-19.sslip.io`
- Email saat ini: `sendVerificationEmail`, `sendWelcomeEmail`, `sendResetPasswordEmail` via `src/lib/email.ts` (planned Resend — **belum implemented**, masih di PLAN §19 backlog "outbound email")
- Auth flow butuh email verification (Better Auth `requireEmailVerification: true`)
- **STATUS EMAIL: BLOCKED** — tanpa outbound email, signup user baru gak bisa verify email → gak bisa login

### Cubicle (`/root/projek/cubicle`)
- Stack: Next.js 16 + Better Auth + Drizzle + Postgres + R2
- Live: `https://cubicle.168-144-37-19.sslip.io`
- Email: `src/lib/notifications.ts` udah pakai **Resend** (`RESEND_API_KEY=***` di `.env`)
- Template sudah ada, type-stamped
- Auth: `requireEmailVerification: false` — saat ini tanpa verification tapi bisa enable nanti

### Kenapa beda state
PremiAcc **belum** connect outbound email (parked). Cubicle **sudah** pakai Resend (onboarding@resend.dev default). Keduanya butuh email domain custom yang proper, bukan `onboarding@resend.dev`.

---

## 3. Arsitektur mail.nggawe.web.id (current)

```
┌─────────────────────────────────────────────────────────────────────┐
│ CF Worker: cloud-mail (account 07075868...)                          │
│ Bindings:                                                           │
│   - d1: cloud-mail-db UUID 6addf56b...  ← NEW (contenly.app users)   │
│   - kv: 779ba63ea2c04095b55af92c410029fb                            │
│   - r2: cloud-mail-r2 (kosong, no domain)                           │
│   - domain: ["contenly.app"] (NOT nggawe.web.id)                    │
│   - admin: "admin@contenly.app"                                     │
│   - jwt_secret: "contenly-mail-jwt-2026-secret"                     │
│                                                                       │
│ Routes: mail.contenly.app/*                                          │
│ HTTP functions: login, register, /api/email/list, /api/email/send... │
│ NO email event handler visible                                       │
└─────────────────────────────────────────────────────────────────────┘

CF Email Routing — nggawe.web.id zone:
  12 rules per-user (admin/budi/cahyo/.../subhan) → worker "cloud-mail"

CF Email Routing — contenly.app zone:
  *@mail.contenly.app → forward to lostyoungsters@gmail.com (personal!)

OLD D1: cloud-mail-db UUID 1df9950a... ← ORPHAN, 14 user + 16 account + 9 email
```

**Ditemukan bugs:**
- `/api/email/list` → 500 `Cannot read 'allReceive'`
- `/api/email/latest` → 500 `D1_TYPE_ERROR`
- `/api/inbox` (frontend alias) → 404

---

## 4. Dua arah mailing untuk dipecahkan

### Arah A: OUTBOUND (PremiAcc/Cubicle → customer)

Kasus: kirim email verification, reset password, notifikasi order, invoice.

**Opsi yang ada:**

| Opsi | Cocok untuk | Effort | Cost |
|---|---|---|---|
| **A1. Resend (recommended)** | Kedua project | Low — tinggal verify domain | Free tier 3k/bln, lalu $20/bln |
| A2. AWS SES | PremiAcc | Medium — verify domain, IAM, sandbox removal | $0.10/1k email |
| A3. Mailgun | PremiAcc | Medium | Free tier 5k/bln trial |
| A4. Local Stalwart (`private-mail-stalwart`) | Test only | High — config kosong, no public DNS | Free tapi reputasi IP jelek |

**Rekomendasi: A1 (Resend)** karena:
- Cubicle sudah pakai, cuma perlu ubah `EMAIL_FROM`
- PremiAcc tinggal implement `sendEmail()` wrapper (sudah ada `src/lib/email.ts` yang import Resend pattern)
- Domain custom verification cepat (cuma tambah TXT record)
- 1 dashboard untuk monitor semua email PremiAcc+Cubicle

**Sender plan:**
- `noreply@premiacc.web.id` (verify di Resend)
- `noreply@cubicle.web.id` (verify di Resend)
- `hello@premiacc.web.id` (balasan support, opsional)

### Arah B: INBOUND (customer → PremiAcc/Cubicle)

Kasus: customer reply email, support ticket, kirim attachment balasan invoice.

**Opsi:**

| Opsi | Effort | Use case |
|---|---|---|
| **B1. Cloud Mail Worker (current infra)** | Medium | Webmail UI untuk baca, no SMTP. Butuh fix bugs + tambah route |
| B2. Resend Inbound | Low | Parse email ke webhook, no UI |
| B3. Stalwart + custom mail client | High | Full control SMTP/IMAP, perlu admin SnappyMail/Claws |

**Rekomendasi: B2 dulu (Resend Inbound webhook)** karena:
- PremiAcc butuh support email handler (parse → create ticket)
- Cubicle butuh email-to-task (kirim email → auto-add task)
- Cloud Mail Worker ada bugs, perlu effort extra
- Resend inbound handler simple: webhook POST ke endpoint app, parse `from/subject/text`, simpan ke D1

**Lokasi inbound webhook endpoint:**
- PremiAcc: `POST /api/v1/support/email-inbound` (better-auth-protected, validate Resend signature)
- Cubicle: `POST /api/email/inbound` (similar)

**Tambah domain ke Resend:**
- Verify `premiacc.web.id` di Resend → get MX + DKIM records → apply ke CF DNS zone nggawe.web.id (premiacc.web.id belum ada di CF kita, perlu add zone atau pakai subdomain)
- Same untuk `cubicle.web.id`

**Subdomain choice:**
Kalau gak mau beli zone baru:
- Pakai subdomain `premiacc.nggawe.web.id` (pakai zone existing) — semua email PremiAcc jadi `*@premiacc.nggawe.web.id`
- Sama `cubicle.nggawe.web.id` untuk Cubicle
- Sender: `noreply@premiacc.nggawe.web.id` etc.
- Inbound webhook: `POST https://premiacc.168-144-37-19.sslip.io/api/v1/support/email-inbound`

---

## 5. Plan eksekusi (3 fase)

### Fase 1 — Outbound Resend (1-2 hari)
- [ ] Verify `nggawe.web.id` di Resend dashboard (atau `premiacc.nggawe.web.id` subdomain)
- [ ] Set TXT records: SPF (include resend), DKIM (Resend-provided), DMARC
- [ ] PremiAcc: implement `src/lib/email.ts` pakai Resend pattern dari Cubicle
- [ ] PremiAcc: set `RESEND_API_KEY` + `EMAIL_FROM=noreply@premiacc.nggawe.web.id` di `.env`
- [ ] Cubicle: update `EMAIL_FROM=noreply@cubicle.nggawe.web.id`
- [ ] Test: register user baru di PremiAcc, verify email masuk

### Fase 2 — Inbound webhook (1-2 hari)
- [ ] Tambah CF Email Routing rule: `*@premiacc.nggawe.web.id` → forward to address (Resend inbound email)
- [ ] Resend inbound → webhook ke PremiAcc `POST /api/v1/support/email-inbound`
- [ ] Implement parser: from/subject/text/html/attachments → `support_tickets` table
- [ ] Cubicle: same pattern, parse ke `tasks` table
- [ ] Add inbound endpoint ke auth-protected API group (validate Resend signature header)

### Fase 3 — Cleanup mail.nggawe.web.id (opsional)
- [ ] Decide: keep Cloud Mail Worker atau hapus?
- [ ] If keep: fix `/api/email/list` + `/api/email/latest` bugs, redeploy
- [ ] Migrate nggawe.web.id user data dari OLD D1 (1df9950a) ke NEW D1 (6addf56b) atau hapus
- [ ] Remove 12 per-user rules (ganti catch-all + webhook)

---

## 6. Risk & catatan

1. **Cubicle `onboarding@resend.dev` masih default** — email dari Cubicle sekarang keluar sebagai onboarding@resend.dev (Resend default). Looks unprofessional, harus di-fix bareng Fase 1.
2. **PremiAcc user baru GAK BISA login** sampai outbound email aktif (requireEmailVerification:true). Ini blocker.
3. **Resend free tier** = 3k email/bulan. PremiAcc transaksi tinggi bisa cepat habis. Monitor di dashboard.
4. **DMARC policy** saat ini `p=none` di nggawe.web.id. Aman untuk transit, tapi bisa naikkan ke `p=quarantine` setelah deliverability stabil.
5. **Cloud Mail Worker `jwt_secret` hardcoded** `"contenly-mail-jwt-2026-secret"` — predictable, GANTI via `wrangler secret put` kalau dipake production.
6. **CF Email Routing limit**: kalau pakai Resend inbound, **jangan double forward** (jaga-jaga jangan set rule CF + Resend inbound barengan untuk domain yang sama).
7. **Cubicle `requireEmailVerification: false`** — saat ini gak butuh verify. Tapi kalo enable nanti, butuh outbound juga.

---

## 7. Yang TIDAK dilakukan di fase ini

- ❌ Local Stalwart setup proper (gak worth effort untuk production)
- ❌ Cloud Mail Worker fix bugs (kecuali lo decide untuk pakai webmail UI sebagai inbox)
- ❌ Custom mail client (Roundcube/SnappyMail) untuk POP/IMAP — Resend inbound lebih simple
- ❌ Email templates designer — pakai plain HTML/Resend React Email kalo perlu
- ❌ DKIM key rotation automation
- ❌ Email bounce handling automation
- ❌ Per-project dedicated sending domains (`@premiacc.web.id` vs `@cubicle.web.id` butuh zone baru atau subdomain)

---

## 8. Verifikasi sukses

- [ ] PremiAcc: signup user baru → email verifikasi masuk → klik link → bisa login
- [ ] Cubicle: ganti `EMAIL_FROM` jadi `noreply@cubicle.nggawe.web.id` → email keluar verified (cek via Gmail "show original" DKIM=pass SPF=pass)
- [ ] Inbound: kirim email ke `test@premiacc.nggawe.web.id` dari Gmail → webhook hit PremiAcc → ticket/task created
- [ ] Resend dashboard log showing all events (delivered, opened, clicked, bounced)
- [ ] DNS check: `dig TXT premiac...nggawe.web.id` shows Resend SPF, DKIM, DMARC
