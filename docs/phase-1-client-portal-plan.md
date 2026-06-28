# Cubiqlo Phase 1 — Client Portal Collaboration

Last updated: 2026-06-28

## Goal

Phase 1 fokus bikin client portal lebih layak dipakai klien real:

- dashboard bisa ID/EN
- link portal pendek dan custom
- client comment memicu notifikasi
- client portal punya reminder / document request
- sidebar lebih rapi dengan dropdown
- UI admin buat kontrol fitur portal

## Checklist

### Dashboard ID/EN
- [x] Tambah language switch `ID / EN` di `/app/dashboard`
- [x] Simpan preferensi bahasa di cookie `cubiqlo_lang`
- [x] Terjemahkan dashboard utama: greeting, KPI, attention, revenue, client health, cashflow, activity, timer, schedule, invoice, today tasks
- [ ] Full app i18n selain dashboard

### Short client portal link
- [x] Tambah DB column `clients.portal_slug`
- [x] Tambah DB column `clients.portal_slug_enabled`
- [x] Support access via `/client-portal/[slug]`
- [x] Old token access tetap jalan via `/client-portal/[token]`
- [x] Validasi slug: lowercase, angka, hyphen, 3–60 chars
- [x] UI edit client buat set slug
- [x] UI tampil short link di client portal section
- [x] Copy button buat full short portal URL

### Portal reminders / document requests
- [x] Tambah table `portal_requests`
- [x] Admin bisa create portal request dari client detail tab `Portal`
- [x] Admin bisa pilih type: `document`, `approval`, `info`, `other`
- [x] Admin bisa link ke project optional
- [x] Admin bisa set due date
- [x] Client portal menampilkan `Requests & reminders`
- [x] Client bisa mark request done
- [x] Admin bisa mark done
- [x] Admin bisa cancel
- [x] Admin bisa reopen
- [ ] Admin bisa edit title/description/due date setelah dibuat
- [ ] Hard delete request

### Comment notifications
- [x] Portal comment simpan sebagai `source=portal`, `visibility=client`
- [x] Portal comment bikin in-app notification ke semua workspace members
- [x] Portal comment kirim email via existing Resend helper
- [x] Fallback console jika `RESEND_API_KEY` belum ada
- [ ] WhatsApp notification provider

### Sidebar dropdown
- [x] Sidebar group bisa collapse/expand
- [x] State tersimpan ke `localStorage` key `cubiqlo_sidebar_groups`

### Deploy / verification
- [x] Migration dibuat: `drizzle/0012_phase1_portal_slug_requests.sql`
- [x] Migration applied ke production Docker DB `cubicle-pg`
- [x] `npm run build` sukses
- [x] Commit dibuat: `c7c3add feat: complete client portal phase 1`
- [x] Push ke `origin/main`
- [x] Container `cubicle-cubicle-1` restart
- [x] Health check OK: `GET /api/health` → `{"ok":true}`
- [ ] Playwright E2E khusus portal slug/request/comment flow

## Files changed

```text
drizzle/0012_phase1_portal_slug_requests.sql
src/app/(app)/app/clients/[clientId]/page.tsx
src/app/(app)/app/clients/[clientId]/portal-section.tsx
src/app/(app)/app/dashboard/page.tsx
src/app/client-portal/[token]/page.tsx
src/components/app-sidebar.tsx
src/components/dashboard-language-switch.tsx
src/components/forms/client-form.tsx
src/components/portal/portal-comment-form-action.ts
src/components/portal/portal-request-admin.tsx
src/components/portal/portal-request-list.tsx
src/db/schema.ts
src/lib/actions/clients.ts
src/lib/actions/portal.ts
src/lib/actions/portal-requests.ts
```

## DB changes

### `clients`

```sql
portal_slug text unique null
portal_slug_enabled boolean not null default true
```

### `portal_requests`

```sql
id uuid primary key
workspace_id uuid not null
client_id uuid not null
project_id uuid null
title text not null
description text null
type text not null default 'document'
status text not null default 'pending'
due_date date null
completed_at timestamptz null
created_by text null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

## Current production state

```text
Branch: main
Commit: c7c3add feat: complete client portal phase 1
Container: cubicle-cubicle-1 healthy
DB: cubicle-pg healthy
Health: {"ok":true}
```

## Next recommended phase

Phase 2 — Invoice engine polish:

- invoice template center
- send invoice email from project/client
- invoice PDF template polish
- invoice status automation
- project timeline entry when invoice sent
