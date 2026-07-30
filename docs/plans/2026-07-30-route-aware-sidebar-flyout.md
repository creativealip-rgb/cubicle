# Route-Aware Sidebar Flyout Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Otomatis membuka flyout sidebar desktop berdasarkan grup route aktif tanpa mengubah struktur navigasi atau mobile accordion.

**Architecture:** Tambahkan explicit desktop override state dengan tiga sumber: hover preview, manual override, dan active-route fallback. Extract resolver murni agar behavior dapat diuji tanpa browser; komponen memakai resolver untuk `openGroup` dan mereset override saat pathname berubah.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Tailwind CSS.

---

### Task 1: Lock state resolution with RED unit tests

**Objective:** Membuktikan active route menjadi fallback, hover menang sementara, dan manual close dapat menutup grup aktif.

**Files:**
- Create: `src/lib/sidebar-open-group.test.ts`
- Create: `src/lib/sidebar-open-group.ts`

**Step 1: Write failing test**

Test cases:
- no hover/override + active `work` returns `work`;
- hover `finance` returns `finance`;
- override `personal` returns `personal`;
- explicit closed override returns `null` even when active `work`.

**Step 2: Run test to verify failure**

Run: `docker run --rm -v "$PWD:/app" -w /app node:22-bookworm sh -lc 'npm test -- src/lib/sidebar-open-group.test.ts'`
Expected: FAIL because resolver is missing.

**Step 3: Implement minimal resolver**

Create discriminated override type and pure `resolveSidebarOpenGroup()` function. Priority: hover, manual override, active group.

**Step 4: Run focused test**

Expected: all resolver tests PASS.

### Task 2: Wire route-aware desktop flyout

**Objective:** Desktop sidebar opens current route group and supports manual close until pathname changes.

**Files:**
- Modify: `src/components/sidebar/sidebar-navigation.tsx`
- Create: `src/lib/sidebar-route-aware-wiring.test.ts`

**Step 1: Write failing wiring test**

Assert component:
- imports resolver;
- stores manual override including explicit closed state;
- calculates `openGroup` with `active.groupId`;
- resets override on pathname change;
- renders `ChevronDown` when expanded and `ChevronRight` otherwise.

**Step 2: Verify RED**

Run focused test. Expected FAIL on missing route-aware wiring.

**Step 3: Implement minimal component changes**

- Replace `pinned` state with explicit override state.
- Compute route-aware `openGroup` through resolver.
- Parent click toggles current group between open and explicit closed.
- Hover does not permanently replace route-active default.
- Pathname effect clears override and hover.
- Chevron follows effective expanded state.
- Keep flyout positioning, keyboard navigation, badges, direct links, collapsed behavior, and mobile accordion unchanged.

**Step 4: Verify focused tests**

Expected: resolver and wiring tests PASS.

### Task 3: Full verification and integration

**Objective:** Prove feature introduces no regression before commit/deploy.

**Files:**
- Verify all changed files only.

**Step 1: Run quality gates**

```bash
git diff --check
docker run --rm -v "$PWD:/app" -w /app node:22-bookworm sh -lc 'npm test'
docker run --rm -v "$PWD:/app" -w /app node:22-bookworm sh -lc 'npm run lint'
docker run --rm -v "$PWD:/app" -w /app node:22-bookworm sh -lc 'npm run build'
```

Expected: tests/build pass; no new lint errors.

**Step 2: Commit and push feature branch**

```bash
git add src/lib/sidebar-open-group.ts src/lib/sidebar-open-group.test.ts src/lib/sidebar-route-aware-wiring.test.ts src/components/sidebar/sidebar-navigation.tsx docs/plans/2026-07-30-route-aware-sidebar-flyout.md
git commit -m "feat: open sidebar groups for active routes"
git push origin fix/recover-latest-dev-ui
```

**Step 3: Merge to `dev/integration` and deploy dev**

Merge with `--no-ff`, rerun merged gates, push, run deploy wrapper under shared guardrails. Do not touch production.

**Step 4: Browser QA**

Authenticated desktop routes:
- `/app/clients`, `/app/projects`, `/app/tasks` → Pekerjaan open;
- finance child route → Keuangan open;
- personal child route → Personal open;
- AI child route → AI open;
- click active parent closes; navigation resets and opens correct group;
- mobile accordion remains inline.

Verify live revision, health, port owner, unrelated production HTTP, and fresh logs.
