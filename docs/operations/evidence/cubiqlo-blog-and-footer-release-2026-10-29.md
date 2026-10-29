# Cubiqlo Blog and Landing Footer Release — 2026-10-29

## Scope

- Launched standalone WordPress publication at `https://blog.cubiqlo.com` with isolated MariaDB and Docker volumes.
- Added the Blog link to the Cubiqlo landing footer.
- Built and iteratively polished a custom Cubiqlo publication theme for desktop and mobile.
- Reorganized the main `cubiqlo.com` footer into Product and Legal navigation groups.

## Blog work

- Applied official Cubiqlo identity and the approved `cubiqlo.com | insights` lockup.
- Added sticky responsive navigation, mobile drawer, search, category archive templates, filtered category routes, pagination, branded 404, article sidebar, related insights, contextual CTA, topic links, and generated 16:9 covers for all 10 posts.
- Assigned featured images to all posts and rendered them on homepage cards, featured article, article pages, and related cards.
- Added responsive and hover states, fixed category-query duplication, removed duplicate Browse by Topic and Key Takeaways sections, and compacted homepage CTA.
- WordPress administrator: username `alip`, email `alifpm55@gmail.com`. Password is not documented.
- Admin URL: `https://blog.cubiqlo.com/wp-admin/`.
- Backup and isolated restore scripts live in `/root/projects/cubiqlo-blog-wordpress/scripts/`.

## Landing footer

- File: `src/app/page.tsx`.
- Product group: Workflow, Pricing, Blog.
- Legal group: Terms, Privacy.
- Fixed fifth-link wrapping under Workflow and preserved desktop/mobile tap targets.

## Deployment

- Commit: `f46482d6`.
- Image: `cubiqlo-prod:sha-f46482d6`.
- Active container: `cubiqlo-new-app-next-green`.
- Rollback container: `cubiqlo-new-app-next` (stopped, retained).
- Reverse proxy: `dokploy-traefik` remains sole owner of public ports 80/443.
- Routing uses exact Cubiqlo hosts and internal container port 3000.

## Verification

- `npm run build`: PASS.
- Production health: `{ "status": "ok", "db": "ok" }`.
- `https://cubiqlo.com`: HTTP 200.
- `https://blog.cubiqlo.com`: HTTP 200.
- Footer desktop/mobile browser QA: no horizontal overflow; all five links visible in intended groups.
- WordPress homepage, categories, search, articles, related cards, pagination, mobile drawer, and 404 were browser-tested on desktop and mobile.

## Repository

- Private GitHub repository: `https://github.com/creativealip-rgb/cubiqlo-blog-wordpress`.
- Branch: `main`.
- Initial commit: `cc37916e8f7b2fa6cef8d07621562529c12d838c`.
- Local and remote commit hashes were verified identical.
- Real `.env`, credentials, passwords, logs, backups, and caches are excluded from Git.
