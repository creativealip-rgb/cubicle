# Cubiqlo Development Environment

## Endpoint

- URL: `https://dev.cubiqlo.com`
- Public access: Traefik Basic Auth wajib.
- Application login: akun QA sintetis development terpisah.
- Kredensial lokal VPS: `/root/.secrets/cubiqlo-dev-access.txt` (`0600`).
- Search indexing: `X-Robots-Tag: noindex, nofollow, noarchive`.
- Cache: `no-store`.

Jangan commit kredensial atau menyalin data pengguna production ke development.

## Runtime aktual

`dev.cubiqlo.com` adalah **production-build preview**, bukan HMR lane.

- Service: `cubicle-dev`.
- Image: `cubicle-dev:prod`, dibangun lewat root `Dockerfile`.
- Command image: `node server.js` dari Next.js standalone output.
- Runtime: `NODE_ENV=production`.
- Internal port: `3100`; tidak dipublish ke host.
- Public proxy: hanya `dokploy-traefik` pada port 80/443.
- Route: exact `Host(`dev.cubiqlo.com`)`.
- Database: `cubicle_dev`.
- DB role: `cubiqlo_dev`, non-superuser, tanpa `CREATEDB`/`CREATEROLE`.
- Redis: `cubicle-dev-redis`, terpisah dari production.
- Auth secret dan cookie namespace: terpisah dari production.
- Email, payment, R2, AI, cron, dan Google OAuth: kosong/nonaktif pada service dev.

Source tidak di-bind-mount ke container. Setiap perubahan aplikasi perlu build image baru dan recreate service dev.

## Start / Update

`docker-compose.dev.yml` adalah Compose source untuk lane ini, tetapi shared dev hanya boleh dideploy dari branch `dev/integration` oleh integration owner melalui wrapper terkunci:

```bash
cd /root/.config/superpowers/worktrees/cubicle/dev-integration
scripts/operations/deploy-dev-integration.sh
```

Feature agent tidak boleh menjalankan direct build/recreate, migration dev, `docker rm/restart cubicle-dev`, atau deploy shared dev. Wrapper memverifikasi branch/remote/clean tree, mengambil `flock`, memberi OCI revision commit, lalu membuktikan production tidak berubah.

Jangan pakai `--remove-orphans`; Compose project ini dapat mendeteksi container production sebagai orphan. Jangan recreate `cubicle-pg`, container production, atau `dokploy-traefik` untuk update dev.

## Migration dev

Migration target wajib eksplisit. Runner menolak target kosong dan menolak production `cubicle` tanpa acknowledgement khusus.

```bash
DB_NAME=cubicle_dev ./scripts/migrate-ledger.sh
```

Sebelum migration yang mengubah schema/data:

1. Verifikasi `current_database()` bernilai `cubicle_dev`.
2. Buat `pg_dump -Fc` dan checksum.
3. Restore-test backup ke DB disposable.
4. Jalankan migration dengan target eksplisit.
5. Simpan schema/row-count/reconciliation evidence.

## Verification

```bash
docker inspect cubicle-dev \
  --format 'state={{.State.Status}} health={{.State.Health.Status}} restart={{.HostConfig.RestartPolicy.Name}} ports={{json .HostConfig.PortBindings}} cmd={{json .Config.Cmd}}'

docker exec cubicle-dev sh -lc 'printf "NODE_ENV=%s CUBIQLO_ENV=%s PORT=%s\n" "$NODE_ENV" "$CUBIQLO_ENV" "$PORT"'
docker stats --no-stream cubicle-dev
curl -I https://dev.cubiqlo.com
```

Expected:

- Tanpa Basic Auth: HTTP `401`.
- Dengan Basic Auth: login page HTTP `200`.
- `cmd=["node","server.js"]`.
- `NODE_ENV=production`, `CUBIQLO_ENV=development`, `PORT=3100`.
- `PortBindings`: `{}`.
- Health: `healthy`.
- Response headers memuat `X-Robots-Tag` dan `Cache-Control: no-store`.
- Hanya `dokploy-traefik` bind public port 80/443.

## Resource limit aktual

Konfigurasi `docker-compose.dev.yml`:

- CPU limit: `1.0`.
- Memory limit: `1G`.
- Reservation: `0.1` CPU, `256M` memory.
- Healthcheck: interval `30s`, timeout `5s`, retries `5`, start period `60s`.
- Log rotation: `10m`, maksimum `3` file.

Production-build preview tidak menjalankan compiler Turbopack saat request, jadi tidak memakai cache `.next/dev` atau resource HMR lama.

## QA flow

1. Build dan recreate `cubicle-dev`.
2. Login memakai akun QA sintetis development.
3. Jalankan smoke authenticated pada halaman/flow target.
4. Periksa log container dan respons API terkait.
5. Pastikan tidak ada row production berubah.

## Stop untuk membebaskan resource

```bash
docker compose -f docker-compose.dev.yml stop cubicle-dev cubicle-dev-redis
```

## Database reset

1. Stop `cubicle-dev`.
2. Backup/checksum `cubicle_dev` jika perlu evidence.
3. Drop/recreate **hanya** `cubicle_dev`; jangan menyentuh `cubicle`.
4. Import baseline schema yang disetujui.
5. Rekonsiliasi authoritative migration ledger; jangan replay DDL yang object-nya sudah ada.
6. Buat ulang data QA sintetis.
7. Buktikan login dan smoke authenticated.

## External configuration

- DNS A: `dev.cubiqlo.com` ke VPS.
- Traefik file: `/etc/dokploy/traefik/dynamic/cubicle-dev.yml`.
- Secret file: `/root/.secrets/cubiqlo-dev-access.txt`.
- Local env: `.env.development.local` (gitignored, `0600`).

Backup konfigurasi eksternal sebelum edit. Jangan menambahkan catch-all `PathPrefix(`/`)` tanpa exact host.
