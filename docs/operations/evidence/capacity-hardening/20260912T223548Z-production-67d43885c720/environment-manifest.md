# Phase 0 Environment Manifest

- Run ID: `20260912T223548Z-production-67d43885c720`
- Environment: production source, read-only evidence + logical dump
- Source commit: `67d43885c720f5a729a485816b6a2ec66d211117`
- Running app: `cubiqlo-prod:sha-893c84d68b860c847591356bba93c6496ab1266d|sha256:a04fd7c982a1ab81e9d086b3368d910285634cd1b7efd7f0881fdc84a2b54af2|unless-stopped|{}`
- Authoritative PostgreSQL compose: `/opt/cubiqlo-migration/docker-compose.yml`
- Production DB container: `cubiqlo-new-pg`; database: `cubicle`
- Network: `dokploy-network`; PostgreSQL host port: not published
- Host snapshot:
```text
Linux 6.8.0-124-generic x86_64 GNU/Linux
2
Mem:      8059236352  3571851264  1207128064    43192320  3644911616  4487385088
/dev/vda2      84423806976 59363012608 21500989440  74% /
```
- Sensitive values: excluded.
