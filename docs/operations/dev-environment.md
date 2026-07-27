# Cubiqlo Development Environment

## Endpoint

- URL: `https://dev.cubiqlo.com`
- Public access: Traefik Basic Auth wajib.
- Application login: akun QA development terpisah.
- Kredensial lokal VPS: `/root/.secrets/cubiqlo-dev-access.txt` (`0600`).
- Search indexing: `X-Robots-Tag: noindex, nofollow, noarchive`.
- Cache: `no-store`.

Jangan commit kredensial atau menyalin data pengguna production ke development.

## Isolation

- Service: `cubicle-dev`.
- Internal port: `3100`; tidak dipublish ke host.
- Public proxy: hanya `dokploy-traefik` pada port 80/443.
- Route: exact `Host(`dev.cubiqlo.com`)`.
- Database: `cubicle_dev`.
- DB role: `cubiqlo_dev`, non-superuser, tanpa `CREATEDB`/`CREATEROLE`.
- Initial database: schema-only clone, tanpa row production.
- Auth secret: terpisah dalam `.env.development.local`.
- Cookie: `__Secure-cubiqlo_dev.*`, host-only; tidak memakai `.cubiqlo.com`.
- Email, payment, R2, AI, cron, dan Google OAuth: kosong/nonaktif pada service dev.

## Start / Update

`docker-compose.dev.yml` adalah satu-satunya Compose source untuk service ini. Jangan menambahkan override yang mengganti `next dev` menjadi `next start`.

```bash
docker compose -f docker-compose.dev.yml config --quiet
docker compose -f docker-compose.dev.yml up -d --force-recreate cubicle-dev
```

Runtime wajib menunjukkan `next dev` dan `NODE_ENV=development`. Perintah ini hanya merecreate `cubicle-dev`; jangan gunakan `--remove-orphans` karena project Compose juga mendeteksi container production sebagai orphan.

## Stop untuk membebaskan resource

```bash
docker compose -f docker-compose.dev.yml stop
```

## Verification

```bash
docker inspect cubicle-dev \
  --format 'state={{.State.Status}} health={{.State.Health.Status}} restart={{.HostConfig.RestartPolicy.Name}} ports={{json .HostConfig.PortBindings}}'

docker stats --no-stream cubicle-dev
curl -I https://dev.cubiqlo.com
```

Expected:

- Tanpa Basic Auth: HTTP `401`.
- Dengan Basic Auth: login page HTTP `200`.
- `PortBindings`: `{}`.
- Health: `healthy`.
- Response headers memuat `X-Robots-Tag` dan `Cache-Control: no-store`.
- Hanya `dokploy-traefik` bind public port 80/443.

## Resource limit

Next.js development compiler membutuhkan memory besar saat cold compile halaman dashboard.

- CPU limit: `1.0`.
- Memory limit: `2G`.
- `1280M` terbukti tidak cukup: cold compile route `/` pada Next.js 16 Turbopack membuat container `OOMKilled=true` dan respons HTTP `502`.
- Cache Turbopack `.next/dev` memakai Docker named volume `cubicle-dev-next-cache`, bukan bind mount host. Source `/app` tetap bind-mounted agar HMR membaca perubahan repo.
- Cold compile memakai resource besar; pantau `docker stats`.
- Stop service saat tidak dipakai karena VPS sudah memiliki swap pressure tinggi.

## HMR check

1. Login memakai kredensial QA development.
2. Buka halaman target.
3. Edit source lokal.
4. Pastikan perubahan tampil tanpa image production rebuild.
5. Revert perubahan test yang tidak diperlukan.

## Database reset

Jangan replay semua migration SQL sampai migration ledger dibenahi. Untuk reset aman:

1. Stop `cubicle-dev`.
2. Drop/recreate `cubicle_dev` saja; jangan menyentuh `cubicle`.
3. Import schema-only dari production.
4. Pastikan total production rows tidak berubah.
5. Buat ulang data QA sintetis.

## External configuration

- DNS A: `dev.cubiqlo.com` ke VPS.
- Traefik file: `/etc/dokploy/traefik/dynamic/cubicle-dev.yml`.
- Secret file: `/root/.secrets/cubiqlo-dev-access.txt`.
- Local env: `.env.development.local` (gitignored, `0600`).

Backup konfigurasi eksternal sebelum edit. Jangan menambahkan catch-all `PathPrefix(`/`)` tanpa exact host.
