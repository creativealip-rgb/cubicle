# Cubiqlo Admin Dashboard Plan — FINAL

> **Status:** Plan final — keputusan sudah di-lock, siap implementasi P0.
> **Environment:** Dev first. Production requires explicit approval.
> **Author:** Wowo (Hermes)
> **Tanggal:** 2026-08-17

**Goal:** Superadmin dashboard di subdomain terpisah `admin.cubiqlo.com` untuk pemilik Cubiqlo — pantau seluruh user/workspace, add user, edit user, suspend (revoke sesi aktif), dan pantau revenue/payment.

---

## 0. Keputusan Terkunci (final)

| # | Keputusan | Nilai |
|---|---|---|
| 1 | Model superadmin | Kolom `users.role` (`user` \| `admin`, default `user`) |
| 2 | Akses | **Subdomain terpisah** `admin.cubiqlo.com` (bukan `/admin` di app) |
| 3 | Suspend | Ban login + **revoke semua sesi aktif** user |
| 4 | Ubah tier user | **Langsung** via admin (`changeUserPlan`: set `users.plan` + `planExpiresAt`), tanpa mark-paid; payment log read-only |
| 5 | Bootstrap superadmin | `UPDATE users SET role='admin' WHERE email='admin@cubiqlo.com'` (prod) |
| 6 | Add user flow | **Silent provisioning** — buat langsung `emailVerified=true`, tanpa kirim email verifikasi |

---

## 1. Arsitektur Subdomain

### 1.1 Gambaran routing

```
admin.cubiqlo.com/*  →  admin app (route group /admin, internal)
app.cubiqlo.com/*    →  app end-user (tetap)
app.cubiqlo.com/admin*  →  308 redirect ke admin.cubiqlo.com
cubiqlo.com/admin*   →  redirect (via canonical) ke admin.cubiqlo.com
```

Satu Next.js app yang sama, dipisah by host. Cookie session Better Auth **sudah cross-subdomain** (`.cubiqlo.com`), jadi login di `app.cubiqlo.com` otomatis valid di `admin.cubiqlo.com`.

### 1.2 DNS

Tambahkan record:
```
admin.cubiqlo.com  A  →  IP VPS yang sama dengan app.cubiqlo.com
```
(Atau CNAME ke domain apex — tergantung setup DNS yang ada. IP VPS: lihat record `app.cubiqlo.com` saat ini.)

### 1.3 Traefik (docker-compose.yml)

Tambahkan `Host(\`admin.cubiqlo.com\`)` ke 2 router (http + https) service `cubicle`:

```yaml
# router https (existing) — tambah host admin
- traefik.http.routers.cubicle.rule=Host(`cubiqlo.com`) || Host(`www.cubiqlo.com`) || Host(`app.cubiqlo.com`) || Host(`admin.cubiqlo.com`)
# router http (existing) — tambah host admin
- traefik.http.routers.cubicle-http.rule=Host(`cubiqlo.com`) || Host(`www.cubiqlo.com`) || Host(`app.cubiqlo.com`) || Host(`admin.cubiqlo.com`)
```

TLS cert otomatis via Let's Encrypt (certresolver sudah ada).

### 1.4 host-routing.ts

Update `src/lib/host-routing.ts`:
- Tambah konstanta `ADMIN_HOST = "admin.cubiqlo.com"`.
- Rule: `app.cubiqlo.com` / `cubiqlo.com` dengan path `/admin` → redirect ke `https://admin.cubiqlo.com<path>`.
- Rule: `admin.cubiqlo.com` dengan path `/` → serve admin dashboard (internal map ke `/admin/dashboard`), dan path selain `/admin` → rewrite/prepend `/admin`.

**Catatan:** karena Next.js App Router route-nya path-based, gunakan pendekatan rewrite di `proxy.ts` (bukan redirect) untuk host admin: `admin.cubiqlo.com/foo` → internally serve `/admin/foo`. Ini transparan buat user.

### 1.5 Auth trustedOrigins

Di `src/lib/auth.ts` `trustedOrigins`, tambahkan:
```
"https://admin.cubiqlo.com",
"http://admin.cubiqlo.com",
```

### 1.6 auth-environment.ts

Fungsi `getAuthEnvironmentOptions` sudah return `crossSubDomainCookies.enabled = true, domain = ".cubiqlo.com"` untuk production app (`BETTER_AUTH_URL === https://app.cubiqlo.com`). **Tidak perlu diubah** — cookie tetap `.cubiqlo.com`, jadi `admin.cubiqlo.com` ikut terbaca.

### 1.7 BETTER_AUTH_URL / baseURL

`BETTER_AUTH_URL` tetap `https://app.cubiqlo.com` (titik auth utama). Session validation di admin tetap pakai `auth.api.getSession({ headers })` — cookie `.cubiqlo.com` dikirim browser, jadi valid.

---

## 2. Data Model (schema + migration)

File: `src/db/schema.ts` + `drizzle/0079_admin_dashboard.sql`

### 2.1 Kolom `users` baru

```sql
ALTER TABLE users
  ADD COLUMN role text NOT NULL DEFAULT 'user',       -- 'user' | 'admin'
  ADD COLUMN banned boolean NOT NULL DEFAULT false,
  ADD COLUMN banned_at timestamptz,
  ADD COLUMN banned_reason text;
```

### 2.2 Table baru `admin_audit_logs`

```sql
CREATE TABLE admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id text REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,              -- lihat daftar enum di §5
  target_user_id text REFERENCES users(id) ON DELETE SET NULL,
  target_workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_audit_logs_created ON admin_audit_logs (created_at DESC);
CREATE INDEX idx_admin_audit_logs_admin ON admin_audit_logs (admin_user_id, created_at DESC);
```

### 2.3 Enum action (referensi)

`user.create`, `user.update`, `user.password_reset`, `user.ban`, `user.unban`, `user.plan_change`, `workspace.view` (opsional), `admin.bootstrap`.

---

## 3. Keamanan & Guard

### 3.1 `src/lib/admin.ts` (baru)

```ts
export async function requireAdmin(): Promise<SessionUser> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const [row] = await db.select({ role: users.role, banned: users.banned })
    .from(users).where(eq(users.id, user.id)).limit(1);
  if (!row || row.role !== "admin") throw new ForbiddenError("Admin access denied");
  if (row.banned) throw new UnauthorizedError("Account suspended");
  return user;
}
export async function writeAdminAudit(adminId, action, opts) { ... }
```

### 3.2 Guard layout admin

`src/app/(admin)/admin/layout.tsx`:
- `requireAdmin()` → kalau gagal redirect ke `https://app.cubiqlo.com/app/dashboard` (bukan render).
- Render `AdminShell` + `AdminSidebar`.
- Pastikan guard di layout BUKAN satu-satunya pertahanan — setiap server action juga panggil `requireAdmin()`.

### 3.3 Ban enforcement (hook session)

Di `src/lib/auth.ts`, extend `databaseHooks.session.create.before`:
- Ambil `users.banned` dari DB untuk `session.userId`.
- Kalau banned → throw → login ditolak (Better Auth akan gagalkan session creation).

Helper `banUser(userId, reason)`:
1. Set `users.banned=true, banned_at, banned_reason`.
2. **Revoke semua sesi aktif**: `DELETE FROM sessions WHERE user_id = userId`.
3. Tulis audit log.
4. `revalidatePath`.

### 3.4 Self-protection

- Admin **tidak bisa** ban / downgrade role / edit dirinya sendiri via UI (guard di action: `targetUserId !== adminId`).
- Bootstrap admin hanya via SQL (bukan UI).

### 3.5 Rate-limit

Reuse `distributed-rate-limit` di route admin (misal `limit: 30, windowSec: 60` per admin).

---

## 4. Route & Halaman

Route group baru: `src/app/(admin)/admin/` (layout + sidebar sendiri, terpisah dari AppShell end-user).

| Route (di admin.cubiqlo.com) | Konten |
|---|---|
| `/` | Redirect ke `/dashboard` |
| `/dashboard` | **KPI** — total user, user baru 7/30 hari, MRR, conversion free→paid, total workspace, total payment completed |
| `/users` | **List user global** — tabel + search (nama/email) + filter (plan, banned, emailVerified, role) + pagination + tombol "Add user" |
| `/users/new` | **Add user** — form nama/email/password + toggle verifikasi email + assign plan |
| `/users/[userId]` | **Detail user** — profil, plan, status ban, workspace+role, statistik (client/project/invoice), last login (dari `sessions`), payment history, tombol edit/ban/unban/reset-password |
| `/users/[userId]/edit` | **Edit user** — nama, email, emailVerified, banned (plan/tier diubah via action `changeUserPlan` terpisah) |
| `/workspaces` | **List workspace** — nama, owner, jumlah member, dibuat |
| `/workspaces/[workspaceId]` | **Detail workspace** — info + list member + role |
| `/payments` | **Payment log (read-only)** — list `pakasir_payments` + filter status + detail raw payload |
| `/audit` | **Audit log** — list `admin_audit_logs` |

---

## 5. Server Actions / API

File baru `src/lib/actions/admin/`:

| Action | Fungsi | Audit |
|---|---|---|
| `listUsers({ search, plan, banned, verified, role, page })` | Query global + filter + paginate | — |
| `getUserDetail(userId)` | Profil + workspace + statistik + sessions + payments | — |
| `createUser({ name, email, password, verified, plan })` | Silent provisioning: buat akun + hash password + set `emailVerified` langsung (tanpa kirim email) + assign plan | `user.create` |
| `updateUser({ userId, name, email, emailVerified })` | Update identitas | `user.update` |
| `resetUserPassword(userId, newPassword)` | Hash password (better-auth crypto) + update account | `user.password_reset` |
| `banUser(userId, reason)` | Set banned + revoke sessions | `user.ban` |
| `unbanUser(userId)` | Clear banned | `user.unban` |
| `listWorkspaces({ search })` / `getWorkspaceDetail(workspaceId)` | Query global | — |
| `changeUserPlan({ userId, plan, planExpiresAt, reason })` | Set `users.plan` + `planExpiresAt` langsung (null = permanen) | `user.plan_change` |
| `listPayments({ status })` | Query `pakasir_payments` (read-only) | — |
| `listAuditLogs({ page })` | Query audit | — |

**Password hashing:** gunakan `hashPassword` dari `@better-auth/utils/password` (konvensi repo, lihat `actions/account.ts`). JANGAN simpan plaintext.

**Ubah tier langsung (decision):** admin set `users.plan` + `planExpiresAt` tanpa membuat baris `pakasir_payments`. `planExpiresAt = null` → permanen sampai diubah lagi; set tanggal → kedaluwarsa otomatis via cron `expire-plans`. Audit `user.plan_change` wajib simpan old→new + alasan.

---

## 6. Komponen UI

Folder `src/components/admin/`:

- `admin-shell.tsx` — wrapper layout (header + content)
- `admin-sidebar.tsx` — nav (Dashboard, Users, Workspaces, Payments, Audit)
- `users-table.tsx` — tabel + filter bar + pagination
- `user-form.tsx` — form add/edit (reuse create + edit)
- `user-detail-tabs.tsx` — tabs Profil/Workspace/Statistik/Payments/Sessions
- `ban-dialog.tsx` — konfirmasi ban + alasan
- `reset-password-dialog.tsx` — konfirmasi + input password baru
- `workspaces-table.tsx`, `workspace-detail.tsx`
- `payments-table.tsx`, `payment-detail-dialog.tsx` (raw payload + mark paid)
- `audit-table.tsx`
- `admin-kpi-cards.tsx` — 6 kartu KPI

Gunakan shadcn/radix existing (Dialog, Select, Switch, Tabs, Table). Mobile responsive (sticky bar, touch target) sesuai konvensi repo.

---

## 7. Fase Implementasi (urut, per-file)

### P0 — Fondasi + User management (inti)

1. **Schema** — `schema.ts`: tambah `role/banned/banned_at/banned_reason` di `users` + `adminAuditLogs` table + relations. Migration `drizzle/0079_admin_dashboard.sql`.
2. **`src/lib/admin.ts`** — `requireAdmin()` + `writeAdminAudit()`.
3. **Ban hook** — `src/lib/auth.ts` extend session create hook; helper ban/unban.
4. **host-routing + proxy** — `host-routing.ts` + `proxy.ts` handle `admin.cubiqlo.com` (rewrite + redirect).
5. **auth trustedOrigins** — `auth.ts` tambah admin origins.
6. **Layout admin** — `src/app/(admin)/admin/layout.tsx` + `admin-shell.tsx` + `admin-sidebar.tsx`.
7. **User list** — `/admin/users` + `users-table.tsx` + `listUsers`.
8. **User detail** — `/admin/users/[userId]` + `user-detail-tabs.tsx` + `getUserDetail`.
9. **Add user** — `/admin/users/new` + `user-form.tsx` + `createUser`.
10. **Edit user** — `/admin/users/[userId]/edit` + `updateUser` + `resetUserPassword`.
11. **Ban/unban** — `ban-dialog.tsx` + `banUser`/`unbanUser`.
12. **Audit log** — semua mutasi tulis audit + halaman `/admin/audit` + `audit-table.tsx` + `listAuditLogs`.
13. **Test wiring** — tambah `admin-wiring.test.ts` (mirror pola repo) + `tsc --noEmit` + vitest + `next build` + smoke.

### P1 — Pemantauan

14. **Dashboard KPI** — `/admin/dashboard` + `admin-kpi-cards.tsx` (total user, new 7/30d, MRR, conversion).
15. **Workspaces** — `/admin/workspaces` + `/[workspaceId]`.
16. **Payments** — `/admin/payments` + `markPaymentPaid`.

### P2 — Ops lanjutan (opsional)

17. Impersonate user (login as) — butuh audit kuat + consent.
18. Broadcast announcement (email/notif massal).
19. Storage/AI usage monitoring per user.

---

## 8. Acceptance Criteria

- [ ] Hanya `users.role='admin'` bisa akses `admin.cubiqlo.com/*`; non-admin redirect ke app, dan server action nolak (defense-in-depth, bukan cuma UI).
- [ ] `admin.cubiqlo.com` ter-resolve & serve admin app; `app.cubiqlo.com/admin` redirect ke admin subdomain.
- [ ] Cookie session valid lintas subdomain (login di app → bisa buka admin tanpa login ulang).
- [ ] Admin lihat semua user lintas workspace (global) + search + filter jalan.
- [ ] Add user → akun login valid (password ter-hash, bisa login, emailVerified sesuai toggle).
- [ ] Edit user → nama/email/plan/planExpiresAt berubah benar.
- [ ] Reset password → user bisa login dengan password baru.
- [ ] Ban → sesi aktif di-revoke + login baru ditolak; unban mengembalikan akses.
- [ ] Admin tidak bisa ban/edit/downgrade dirinya sendiri.
- [ ] Ubah tier → `users.plan`/`planExpiresAt` berubah + tercatat audit (old→new + alasan); user langsung dapat akses tier baru.
- [ ] Setiap mutasi admin tercatat di `admin_audit_logs`.
- [ ] `tsc --noEmit` clean, vitest hijau, `next build` sukses, smoke OK.
- [ ] QA visual desktop + mobile (screenshot autentikasi) untuk list/detail/form.

---

## 9. Risiko

1. **Lockout admin** — mitigasi: bootstrap via SQL; self-protection guard (tidak bisa edit diri).
2. **Rewrite host di proxy** — pastikan rewrite `/admin` tidak bentrok dengan public path `admin` yang ada (saat ini tidak ada route `/admin`, aman).
3. **Ubah tier langsung** — tidak membuat baris `pakasir_payments`, jadi MRR/revenue (dari completed payments) tidak menghitung user ini; wajib alasan + audit (old→new). `planExpiresAt` jangan di masa lalu (grace period langsung downgrade).
4. **Revoke sesi saat ban** — delete `sessions` langsung; pastikan tidak ada side effect ke table lain (FK cascade sudah ada).
5. **DNS/Traefik** — admin subdomain butuh DNS record + Traefik reload; uji HTTPS cert valid sebelum go-live.

---

## 10. Rollout

1. Dev branch: `feature/admin-dashboard` dari `main`.
2. Implement P0 → `tsc`/vitest/build/smoke → screenshot QA dev (authenticated, dua browser admin+non-admin).
3. Review Alip → approval.
4. Merge `main` → deploy Dokploy (`cubiqlo-new-app-next`, rebuild image) + update Traefik labels (tambah host admin).
5. Tambah DNS record `admin.cubiqlo.com`.
6. Bootstrap akun admin di prod DB via SQL:
   ```sql
   UPDATE users SET role='admin' WHERE email='admin@cubiqlo.com';
   ```
7. Verifikasi live: login app → buka admin.cubiqlo.com → add/edit/ban test user → cek audit log.

**Tidak ada deploy/commit/migrate sampai approval eksplisit.**
