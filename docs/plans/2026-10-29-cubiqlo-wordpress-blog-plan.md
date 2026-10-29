# Cubiqlo WordPress Blog Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Launch a branded, SEO-ready WordPress blog at `https://blog.cubiqlo.com`, isolated from Cubiqlo SaaS runtime and ready for agent-assisted draft creation.

**Architecture:** Run WordPress and MariaDB as a separate Docker Compose project on the same VPS. Expose WordPress only through existing `dokploy-traefik` using exact `Host(`blog.cubiqlo.com`)` routes; no project proxy and no public app/DB ports. Keep Cubiqlo app, auth, PostgreSQL, migrations, and release flow untouched.

**Tech Stack:** WordPress 6.x, MariaDB 11.4, Docker Compose, dokploy-traefik, Cloudflare DNS, WordPress REST API, Application Password, native Gutenberg, existing VPS backup workflow.

---

## 1. Product decisions

### Canonical URLs

```text
Public blog: https://blog.cubiqlo.com
Article:     https://blog.cubiqlo.com/<slug>
Admin:       https://blog.cubiqlo.com/wp-admin
REST API:    https://blog.cubiqlo.com/wp-json/wp/v2
```

Do not proxy WordPress under `cubiqlo.com/blog`. Subdomain isolation avoids asset, cookie, rewrite, canonical, and upgrade conflicts.

### Responsibilities

```text
cubiqlo.com       Marketing landing
app.cubiqlo.com   Cubiqlo SaaS
blog.cubiqlo.com  WordPress content publication
Coder/Wowo        Create drafts through REST API
Alip/editor       Review, schedule, and publish
```

### First-release scope

- WordPress + isolated MariaDB.
- Exact-host HTTPS route.
- Cubiqlo-branded child theme.
- Blog home, article, category, tag, author, search, and 404 templates.
- Native Gutenberg editor.
- Cover image/media library.
- Draft, scheduled, and published workflows.
- SEO metadata, canonical, Open Graph, Article schema, sitemap, RSS, robots.
- Header/footer links between Cubiqlo and blog.
- Agent REST credentials restricted to editor role.
- Backups and one restore rehearsal.
- Mobile, accessibility, SEO, and production browser QA.

### Explicitly deferred

- Native blog tables/routes inside Cubiqlo.
- WordPress multisite.
- WooCommerce.
- Comments in first release.
- Newsletter platform build.
- Automatic publishing by agents.
- Custom block plugin/framework.
- Importing unrelated VAI content.

---

## 2. File and runtime layout

Create standalone project:

```text
/root/projects/cubiqlo-blog-wordpress/
├── compose.yaml
├── .env                       # 600, never committed
├── .env.example               # names/placeholders only
├── README.md
├── scripts/
│   ├── backup.sh
│   ├── restore-test.sh
│   ├── health-check.sh
│   └── create-agent-user.sh
└── theme/
    └── cubiqlo-blog-child/
        ├── style.css
        ├── functions.php
        ├── theme.json
        ├── templates/
        ├── parts/
        └── assets/
```

Persistent volumes:

```text
cubiqlo-blog-db     → /var/lib/mysql
cubiqlo-blog-wp     → /var/www/html
cubiqlo-blog-backup → backup destination or host bind mount
```

Traefik configuration:

```text
/etc/dokploy/traefik/dynamic/cubiqlo-blog.yml
```

Exact route only:

```text
Host(`blog.cubiqlo.com`)
```

No `PathPrefix(`/`)` without host. No WordPress nginx/Traefik/Caddy. No project bind on public `80/443`.

---

### Task 1: Preflight and immutable baseline

**Objective:** Prove infrastructure, DNS, ports, and current Cubiqlo runtime are safe before mutation.

**Files:**
- Read: `/root/.hermes/shared-workspace/DEPLOYMENT_GUARDRAILS.md`
- Read: `/root/.hermes/shared-workspace/DEPLOY_RULES.md`
- Run: `/root/.hermes/shared-workspace/PRE_DEPLOY_CHECK.sh`
- Create: `/root/projects/cubiqlo-blog-wordpress/docs/preflight.txt`

**Steps:**

1. Record current owners of ports 80/443; expected only `dokploy-traefik`.
2. Record `cubiqlo.com`, `app.cubiqlo.com`, and `dev.cubiqlo.com` health.
3. Check whether `blog.cubiqlo.com` DNS or Traefik route already exists.
4. Record free disk/RAM and Docker network `dokploy-network`.
5. Confirm no existing `cubiqlo-blog-*` containers or volumes.
6. Run pre-deploy check from project directory.

**Verification:**

```bash
ss -lntp | grep -E ':(80|443) '
docker ps --filter publish=80 --filter publish=443 --format '{{.Names}} {{.Ports}}'
curl -fsS https://cubiqlo.com/api/health
```

Expected: existing Cubiqlo health remains 200; only `dokploy-traefik` owns 80/443.

---

### Task 2: Create isolated Compose project

**Objective:** Define WordPress and MariaDB without public port bindings.

**Files:**
- Create: `/root/projects/cubiqlo-blog-wordpress/compose.yaml`
- Create: `/root/projects/cubiqlo-blog-wordpress/.env.example`
- Create: `/root/projects/cubiqlo-blog-wordpress/.gitignore`

**Services:**

```text
cubiqlo-blog-db         mariadb:11.4
cubiqlo-blog-wordpress  wordpress:6.8-apache
```

**Required rules:**

- Pin explicit image versions.
- `restart: unless-stopped`.
- MariaDB only on private Compose network.
- WordPress joins private network and external `dokploy-network`.
- No `ports:` section.
- DB healthcheck required.
- WordPress waits for healthy DB.
- Named volumes external or explicitly named to prevent accidental rename.
- Resource limits documented after observing baseline usage.

**Verification:**

```bash
docker compose config
```

Expected: valid config; no host port publication; no secret values printed in committed files.

---

### Task 3: Provision runtime secrets safely

**Objective:** Create strong runtime secrets without storing them in Git or logs.

**Files:**
- Create: `/root/projects/cubiqlo-blog-wordpress/.env` with mode `600`
- Modify: `/root/projects/cubiqlo-blog-wordpress/.gitignore`

**Variables:**

```text
WORDPRESS_DB_NAME
WORDPRESS_DB_USER
WORDPRESS_DB_PASSWORD
MARIADB_ROOT_PASSWORD
WORDPRESS_TABLE_PREFIX
```

Use `openssl rand` for passwords. Do not reuse Cubiqlo, VAI, Hermes, Cloudflare, or VPS credentials.

**Verification:**

```bash
stat -c '%a %U:%G %n' .env
git check-ignore .env
```

Expected: `600 root:root`; `.env` ignored.

---

### Task 4: Start internal WordPress and verify persistence

**Objective:** Boot WordPress and MariaDB internally before exposing DNS or TLS.

**Files:**
- Modify only runtime volumes created by Compose.

**Steps:**

1. Start DB and wait for health.
2. Start WordPress.
3. Probe WordPress from inside `dokploy-network`.
4. Restart both containers.
5. Re-probe and prove files/DB persist.

**Verification:**

```bash
docker compose up -d
docker compose ps
docker exec cubiqlo-blog-wordpress curl -fsS http://127.0.0.1/
docker inspect cubiqlo-blog-db --format '{{.State.Health.Status}}'
```

Expected: DB `healthy`; WordPress returns installer or configured home; no public port appears.

---

### Task 5: Add exact-host Traefik route

**Objective:** Expose WordPress through existing public proxy only.

**Files:**
- Create: `/etc/dokploy/traefik/dynamic/cubiqlo-blog.yml`

**Route contract:**

```text
HTTP Host(blog.cubiqlo.com) → redirect-to-https@file
HTTPS Host(blog.cubiqlo.com) → http://cubiqlo-blog-wordpress:80
TLS resolver: letsencrypt
Network: dokploy-network
```

**Verification before DNS:**

```bash
curl -k --resolve blog.cubiqlo.com:443:31.97.109.33 https://blog.cubiqlo.com/
```

Expected: WordPress response from destination, existing Cubiqlo hosts unchanged.

---

### Task 6: Configure Cloudflare DNS

**Objective:** Point blog traffic to destination VPS without changing Cubiqlo app records.

**DNS record:**

```text
Type: A
Name: blog
Content: 31.97.109.33
Proxy: Proxied
TTL: Auto
```

**Verification:**

```bash
getent ahostsv4 blog.cubiqlo.com
curl -I https://blog.cubiqlo.com/
```

Expected: HTTPS 200/installer redirect; Cloudflare proxy active; apex/app records unchanged.

Rollback: remove or restore only `blog` record; never modify apex/app during this task.

---

### Task 7: Complete WordPress installation and hardening

**Objective:** Configure production identity, URLs, roles, and baseline security.

**Configuration:**

```text
Site title: Cubiqlo Blog
Tagline: Fewer apps. More work delivered.
Home/site URL: https://blog.cubiqlo.com
Timezone: Asia/Jakarta
Language: English default, Indonesian content supported
Permalink: /%postname%/
Comments: disabled initially
XML-RPC: disabled unless proven needed
File editor: disabled
Debug display: off
```

Create:

- One administrator for Alip.
- One editor user for agent integration.
- No shared admin password.
- No default `admin` username.

Add WordPress constants through supported environment/config injection:

```php
define('DISALLOW_FILE_EDIT', true);
define('WP_DEBUG_DISPLAY', false);
define('FORCE_SSL_ADMIN', true);
```

**Verification:**

- `/wp-admin` uses HTTPS.
- REST API works.
- XML-RPC is unavailable if disabled.
- Editor cannot install plugins/themes or manage users.

---

### Task 8: Build minimal Cubiqlo child theme

**Objective:** Match Cubiqlo visual identity without copying SaaS runtime code into WordPress.

**Files:**
- Create: `/root/projects/cubiqlo-blog-wordpress/theme/cubiqlo-blog-child/style.css`
- Create: `/root/projects/cubiqlo-blog-wordpress/theme/cubiqlo-blog-child/functions.php`
- Create: `/root/projects/cubiqlo-blog-wordpress/theme/cubiqlo-blog-child/theme.json`
- Create: theme templates/parts/assets as needed

**Design contract:**

```text
Primary: #2563EB
Text: #0F172A
No purple
Professional editorial layout
Strong readability
Responsive mobile navigation
Visible keyboard focus
No generic card overload
```

Header links:

```text
Cubiqlo logo → https://cubiqlo.com
Product → https://cubiqlo.com
Blog → /
Login → https://app.cubiqlo.com/login
Get Started → https://app.cubiqlo.com/signup
```

Footer links back to product, privacy, terms, contact, and RSS.

**Templates:**

- Blog home.
- Single article.
- Category/tag archive.
- Search.
- Author.
- 404.

**Verification:**

- Desktop 1440px.
- Tablet 768px.
- Mobile 390px.
- Keyboard-only navigation.
- No horizontal overflow.

---

### Task 9: Configure SEO and discovery

**Objective:** Make posts indexable with correct canonical and structured metadata.

**Required output:**

- SEO title and meta description per article.
- Canonical URL.
- Open Graph/Twitter image.
- `Article` JSON-LD.
- Breadcrumb schema.
- XML sitemap.
- RSS feed.
- robots.txt allowing public articles and blocking admin/internal paths.
- Author/date modified/date published output.
- Noindex for drafts, previews, author admin pages if unsuitable, and internal search results if selected.

Prefer one established SEO plugin only. Do not install overlapping SEO plugins.

**Verification:**

```bash
curl -fsS https://blog.cubiqlo.com/sitemap_index.xml
curl -fsS https://blog.cubiqlo.com/feed/
curl -fsS https://blog.cubiqlo.com/robots.txt
```

Inspect one published article for canonical, OG, and Article JSON-LD.

---

### Task 10: Configure content taxonomy and editorial template

**Objective:** Establish consistent content structure before publishing.

**Initial categories:**

```text
Client Operations
Productivity
Freelancing
Agency Management
Billing & Finance
Automation
Cubiqlo Updates
```

**Article template:**

1. Search-intent title.
2. Short answer/lead.
3. Problem context.
4. Practical sections with H2/H3.
5. Screenshots or diagrams where useful.
6. Actionable checklist.
7. Contextual Cubiqlo CTA.
8. FAQ when justified.
9. Author and updated date.

Do not create empty categories. Add each category only when first real post uses it.

---

### Task 11: Add media policy

**Objective:** Prevent oversized, duplicate, or unsafe uploads.

**Rules:**

- Cover image target: 1200×630.
- WebP preferred; JPEG fallback.
- Max upload size documented and enforced.
- Descriptive filename and alt text required.
- SVG uploads disabled unless sanitized.
- Strip sensitive EXIF where practical.
- Prevent hotlinking private Cubiqlo/R2 assets.

First release may use WordPress media volume. Add R2 offload only when storage growth justifies it; do not add another plugin now.

---

### Task 12: Agent-assisted draft workflow

**Objective:** Let Coder/Wowo create safe drafts without publish authority.

**Files:**
- Create: `/root/projects/cubiqlo-blog-wordpress/scripts/create-agent-user.sh`
- Create: `/root/projects/cubiqlo-blog-wordpress/docs/agent-publishing.md`
- Store credential outside repo under approved profile secret path

**Authentication:**

- Dedicated WordPress editor user.
- Application Password, not main admin password.
- HTTPS only.
- Revoke independently.
- Never expose token in logs, plan, Git, or chat.

**Default API payload:**

```json
{
  "status": "draft",
  "title": "...",
  "slug": "...",
  "excerpt": "...",
  "content": "...",
  "categories": [],
  "tags": [],
  "featured_media": 0
}
```

**Guardrails:**

- Agent always creates `draft`.
- Scheduling or publishing requires explicit Alip instruction.
- Agent reads post back after create/update.
- Duplicate slug check before create.
- No plugin/theme/user mutations through agent credentials.

**Verification:**

1. Agent creates a test draft.
2. Draft appears in `/wp-admin/edit.php`.
3. Public URL returns 404 or preview-protected response.
4. Agent cannot install plugins or publish if capability is intentionally restricted.
5. Test draft removed after proof.

---

### Task 13: Connect Cubiqlo marketing navigation

**Objective:** Make blog discoverable from Cubiqlo without coupling runtimes.

**Files:**
- Modify exact landing header/footer component after source inspection.
- Test relevant landing navigation tests.

Add external link:

```text
Blog → https://blog.cubiqlo.com
```

Open same tab. Preserve locale behavior and existing landing navigation.

Do not add blog to authenticated SaaS sidebar in first release.

**Verification:**

- Link visible on desktop/mobile landing navigation or footer.
- No hydration issue.
- Existing landing tests/build pass.

This Cubiqlo source change follows normal feature branch → tests → PR → approval → release flow. It is independent from WordPress runtime deployment.

---

### Task 14: Backup and restore rehearsal

**Objective:** Prove blog can recover before real content accumulates.

**Files:**
- Create: `/root/projects/cubiqlo-blog-wordpress/scripts/backup.sh`
- Create: `/root/projects/cubiqlo-blog-wordpress/scripts/restore-test.sh`
- Create evidence under `/root/backups/cubiqlo-blog/<timestamp>/`

Backup must include:

- Logical MariaDB dump.
- WordPress files/uploads.
- Theme source.
- Sanitized deployment manifest.
- SHA-256 checksums.

Restore rehearsal:

- Restore DB and files into temporary isolated volumes.
- Start temporary containers with no public ports/network.
- Check DB tables, post count, media structure, and homepage render.
- Remove temporary fixtures.

**Verification:** checksum PASS, DB integrity PASS, temporary resources left `0`.

---

### Task 15: Security, accessibility, SEO, and browser QA

**Objective:** Prove production quality across public and admin surfaces.

**Public checks:**

- Home, article, category, tag, search, author, 404.
- HTTPS redirect and canonical host.
- Responsive 1440/768/390.
- Keyboard navigation and visible focus.
- Heading order, labels, alt text, contrast.
- Cover image dimensions/no CLS.
- Canonical/OG/schema/sitemap/RSS.
- No mixed content or asset 404.

**Admin checks:**

- Login/logout.
- Create draft.
- Upload cover.
- Preview.
- Schedule.
- Publish only as authorized user.
- Edit and revision history.
- Delete/restore from trash.

**Security checks:**

- No public DB port.
- No exposed secrets.
- Admin endpoints require auth.
- Editor role cannot administer system.
- Login rate limiting or Cloudflare protection configured.
- XML-RPC decision verified.
- WordPress/core/theme/plugin versions recorded.
- Only necessary plugins installed.

**Regression checks:**

```bash
curl -fsS https://cubiqlo.com/api/health
curl -fsS https://app.cubiqlo.com/api/health
curl -fsS https://blog.cubiqlo.com/
docker ps --filter publish=80 --filter publish=443 --format '{{.Names}} {{.Ports}}'
```

Expected: Cubiqlo app unchanged; blog 200; only `dokploy-traefik` owns 80/443.

---

### Task 16: Production handoff and operations

**Objective:** Leave a maintainable system with rollback instructions.

**Files:**
- Create: `/root/projects/cubiqlo-blog-wordpress/README.md`
- Create: `/root/projects/cubiqlo-blog-wordpress/docs/runbook.md`
- Update: `/root/.hermes/shared-workspace/OUTPUT_INDEX.md`

Document:

- URLs and container names.
- Start/stop/update commands.
- Backup/restore commands.
- WordPress update procedure.
- Theme deployment procedure.
- Agent credential revocation.
- DNS rollback.
- Traefik rollback.
- Health checks.
- Storage growth checks.
- Emergency read-only/maintenance mode.

---

## 3. Release gates

Blog is DONE only when every gate passes:

```text
[ ] Exact Host(blog.cubiqlo.com) route only
[ ] No project bind on public 80/443
[ ] HTTPS valid through Cloudflare/Traefik
[ ] WordPress DB healthy and private
[ ] Admin/editor roles separated
[ ] Agent can create draft but cannot silently publish
[ ] Theme matches Cobalt/Slate, no purple
[ ] Public templates responsive and accessible
[ ] Canonical, OG, schema, sitemap, RSS verified
[ ] Backup checksum and isolated restore rehearsal PASS
[ ] Cubiqlo landing/app health unchanged
[ ] Browser QA screenshots captured from live site
[ ] Runbook and rollback proof stored
```

## 4. Rollback

Rollback order:

1. Disable/remove Cloudflare `blog` DNS record or restore previous value.
2. Remove `/etc/dokploy/traefik/dynamic/cubiqlo-blog.yml`.
3. Stop WordPress Compose project without deleting volumes.
4. Verify `cubiqlo.com` and `app.cubiqlo.com` remain healthy.
5. Preserve DB/files for diagnosis.
6. Restore from latest verified backup only if data corruption is proven.

Never use `docker compose down -v` during rollback.

## 5. Suggested delivery batches

```text
Batch A: infrastructure + DNS + blank WordPress
Batch B: theme + SEO + taxonomy
Batch C: agent draft integration
Batch D: Cubiqlo marketing link + full QA
Batch E: backup/restore evidence + handoff
```

Each batch gets separate verification and commit/PR where source-controlled code changes.
