# Cubiqlo Release Checklist

Gunakan untuk setiap production release. Jangan cetak secret value ke log.

## 1. Scope

- [ ] Branch dan scope release jelas.
- [ ] `git status --short` diperiksa; file luar scope tidak di-stage.
- [ ] Perubahan schema, auth, payment, storage, atau email ditandai sebagai high-risk.

## 2. Rollback baseline

Catat sebelum deploy:

```bash
git rev-parse HEAD
docker inspect cubicle-cubicle-1 --format '{{.Image}} {{.State.Health.Status}} {{.HostConfig.RestartPolicy.Name}}'
docker image inspect cubicle-cubicle:latest --format '{{.Id}}'
curl -fsS https://app.cubiqlo.com/api/health
```

- [ ] Commit aktif dicatat.
- [ ] Image ID aktif dicatat.
- [ ] Health app + DB `ok`.
- [ ] Untuk migration: backup + checksum + schema snapshot tersedia.

## 3. Quality gates

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

- [ ] Semua command exit 0.
- [ ] Test terarah untuk perubahan behavior tersedia.
- [ ] `git diff --check` exit 0.

## 4. Deploy safety

```bash
/root/.hermes/shared-workspace/PRE_DEPLOY_CHECK.sh
```

- [ ] Hanya `dokploy-traefik` bind public 80/443.
- [ ] Tidak ada router catch-all tanpa exact `Host(...)`.
- [ ] Image baru selesai dibangun sebelum container lama diganti.

## 5. Deploy

```bash
docker compose build cubicle
docker compose up -d --no-deps --force-recreate cubicle
```

Catat image baru setelah recreate.

## 6. Post-deploy verification

```bash
docker inspect cubicle-cubicle-1 --format '{{.Image}} {{.State.Status}} {{.State.Health.Status}} {{.HostConfig.RestartPolicy.Name}}'
curl -fsS https://app.cubiqlo.com/api/health
curl -LsS -o /dev/null -w '%{http_code} %{url_effective}\n' https://cubiqlo.com/
curl -LsS -o /dev/null -w '%{http_code} %{url_effective}\n' https://app.cubiqlo.com/login
```

- [ ] Container `running healthy`.
- [ ] Restart policy `unless-stopped`.
- [ ] Landing guest tetap landing.
- [ ] Login reachable.
- [ ] Smoke test area terdampak selesai.
- [ ] Port/proxy collision check tetap aman.

## 7. Rollback

Jika health atau smoke gagal:

1. Jangan hapus image lama.
2. Jalankan image ID sebelumnya dengan env/network/labels yang sama.
3. Jangan rollback schema secara buta.
4. Verifikasi health, login, dan flow terdampak.
5. Dokumentasikan failure dan keputusan rollback.

## Sprint 0 baseline — 25 Juli 2026

- Commit sebelum Sprint 0: `1cf3bdca580a4af988e5922ee7859d2a4f5ea397`.
- Image sebelum Sprint 0: `sha256:2216fa0e6882fd0f5e29e364dd65504d0c509473249363291c059e1f6ee7c29f`.
- Runtime sebelum Sprint 0: app healthy, restart policy `no`.
- DB container: healthy, tidak publish port 5432 ke host.
- Quality baseline sebelum Sprint 0: 13 lint error + 3 warning.
- Auth baseline sebelum Sprint 0: production config masih memiliki fallback secret development.
- Rollback image wajib dipertahankan sampai post-deploy verification selesai.
