# Mobile-Responsive App Pages — Implementation Plan

> Build on landing builder v2 patterns. Same repo, same stack.

**Goal:** Make all Cubiqlo app pages readable and tappable at 390px mobile width.

**Stack:** Next.js 16 App Router, Tailwind CSS, shadcn/Radix.

**Baseline:** `main` at `e01aa39`. Prod deployed.

---

## Phase 1: Global Sidebar — Auto-collapse on Mobile 🔴

### Task 1.1: Hamburger menu + overlay

**File:** `src/components/app-sidebar.tsx`

The sidebar is currently always visible. On mobile, it should:
- Collapse to a floating hamburger button (bottom-left or top-left)
- Open as an overlay drawer
- Close on item click or outside tap

**Pattern:** Same as landing builder sidebar overlay — `fixed inset-0 z-50` with bg-black/50 backdrop, sidebar slides in from left.

---

## Phase 2: Dashboard — Mobile Cards 🔴

### Task 2.1: Stack cards vertically, fix overflow

**File:** `src/app/(app)/app/dashboard/page.tsx`

- KPI cards: `grid-cols-1` on mobile (currently 4-column)
- Reminder cards: stack vertically
- "Mulai sini" card: full width
- Tasks list: compact rows

---

## Phase 3: Projects List — Table → Cards 🔴

### Task 3.1: Card-based project list on mobile

**File:** `src/app/(app)/app/projects/page.tsx` + related components

- Desktop: keep existing table
- Mobile: card per project with name, client, status badge, due date
- Filters: wrap or collapse into dropdown on mobile

---

## Phase 4: Tasks — Table → Cards 🔴

### Task 4.1: Card-based task list on mobile

**File:** `src/app/(app)/app/tasks/page.tsx` + related components

- Same pattern as Projects
- Each card: title, project, priority badge, status, due date
- View toggle (List/Board) compact on mobile

---

## Phase 5: Invoices — Table → Cards 🔴

### Task 5.1: Card-based invoice list on mobile

**File:** `src/app/(app)/app/invoices/page.tsx` + related components

- Each card: INV number, client, amount, status badge
- Summary cards at top stack vertically

---

## Phase 6: Global Chrome — Top Bar Polish 🟡

### Task 6.1: Compact top bar on mobile

**File:** `src/components/app-topbar.tsx`

- Search: collapse to icon-only, expand on tap
- Timer: icon only
- AI, Bell, Workspace, Avatar: keep icons, hide labels
- "+ Baru" button: keep

---

## Phase 7: Page Headers — Fix Vertical Text 🟡

### Task 7.1: Fix title wrapping

**Files:** Projects, Tasks, Invoices, Clients pages

The issue: `heading` text breaks letter-by-letter. Fix by ensuring parent container has proper `min-width` or `whitespace-nowrap` + `overflow-hidden` + `text-ellipsis`.

---

## Priority Order

1. **Phase 1** — Sidebar auto-collapse (unblocks ALL pages)
2. **Phase 2** — Dashboard mobile cards
3. **Phase 3** — Projects table→cards
4. **Phase 4** — Tasks table→cards
5. **Phase 5** — Invoices table→cards
6. **Phase 6** — Top bar polish
7. **Phase 7** — Title text fix

---

## Definition of Done

- No horizontal overflow at 390px on any page
- Sidebar collapses to hamburger on mobile
- Tables become readable cards on mobile
- Touch targets ≥ 44px
- Desktop unchanged
- `npx tsc --noEmit` clean, `npm run build` clean
- Dev deploy + verified
