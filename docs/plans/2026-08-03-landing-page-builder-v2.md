# Landing Page Builder v2 — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Complete the remaining landing builder features: drag-from-sidebar, structure mini-map, mobile-first step editor, publish/unpublish toggle, public contact form, and polish. Build on the completed Phase 1-8 baseline from `2026-08-03-landing-page-builder-usability-improvements.md`.

**Architecture:** Extend existing canvas builder. No replacement — additive only. Preserve all existing tabs (Insert/Pages/Templates/Theme/SEO), canvas renderer, properties panel, auto-save, and OG metadata route.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS, @dnd-kit, existing canvas/components, shadcn/Radix.

**Current baseline:** `main` at `33eeaa5`. Prod deployed `cubiqlo.com`.

**Status:** ✅ COMPLETE — all 7 phases implemented & deployed to dev. See commit `79a5155`.

---

## Phase 1: Drag from Sidebar ✅

### Task 1.1: Enable drag-to-canvas from Insert tab

**Objective:** Let users drag section templates from sidebar onto canvas position instead of click-to-add.

**Files:**
- Modify: `src/components/site/canvas/canvas-editor.tsx`
- May touch: `src/components/site/canvas/canvas-renderer.tsx`

**Implementation:**
- Wrap sidebar section buttons in `useDraggable` from `@dnd-kit/core` with `id = template.id`.
- Add drop zones between canvas sections using `useDroppable`.
- On drop, insert `template.build()` at the target position in `activeSections`.
- Keep click-to-add as fallback (mobile tap).
- Drag preview: show template label in a floating chip.

**Acceptance:**
- Drag "Layanan 3 Kartu" from sidebar → canvas between existing sections → section inserted at drop position.
- Click still works (no regression).
- Mobile: tap works normally, no accidental drag triggers on touch.

**Verification:**
```bash
npx tsc --noEmit --pretty false
npx eslint src/components/site/canvas/canvas-editor.tsx src/components/site/canvas/canvas-renderer.tsx
```

---

## Phase 2: Section Reorder Mini-Map ✅

### Task 2.1: Create Structure panel

**Objective:** Add a compact "Structure" tab showing section list with drag reorder — easier than scrolling long canvas.

**Files:**
- Create: `src/components/site/canvas/structure-panel.tsx`
- Modify: `src/components/site/canvas/canvas-editor.tsx`

**Implementation:**
- Add 6th sidebar tab: "Structure".
- Show vertical list: each section as a compact row (icon + heading preview + type label).
- Drag rows to reorder (mirrors canvas section reorder).
- Click row → scroll canvas to that section + select it.
- Show section type icon: text/columns/image/grid for visual scanning.
- Empty state: "Belum ada section. Tambah dari tab Insert."

**Acceptance:**
- Drag row up/down → canvas sections reorder in real-time.
- Click row → canvas scrolls to section, selects it.
- Empty canvas shows guidance message.

**Verification:**
```bash
npx tsc --noEmit --pretty false
npx eslint src/components/site/canvas/structure-panel.tsx src/components/site/canvas/canvas-editor.tsx
```

---

## Phase 3: Mobile Builder Mode ✅

### Task 3.1: Step-based mobile editor

**Objective:** Replace single-canvas mobile view with a step-by-step wizard: Pages → Sections → Content → Theme → Publish. Desktop tetap pakai canvas penuh.

**Files:**
- Create: `src/components/site/canvas/mobile-step-editor.tsx` ✅
- Modify: `src/components/site/canvas/canvas-editor.tsx` ✅

**Implementation:**
- Detect mobile via CSS breakpoint (`md:hidden` / `hidden md:block`).
- Mobile: hide canvas + sidebar tabs, show step editor instead.
- Steps (top stepper):
  1. **Pages** — list pages, add/rename/reorder/set home
  2. **Sections** — tap section template to add, tap existing to delete/reorder
  3. **Theme** — 8 theme presets as tappable cards, accent color picker
  4. **Publish** — slug, SEO preview, readiness checklist, publish toggle
- Back/Next navigation between steps.
- Auto-save after any change (same as desktop).
- Desktop: remains unchanged (full canvas).

**Actual:** Implemented as `MobileStepEditor` component with 4-step wizard. Conditional render at `CanvasEditor` level — `md:hidden` shows mobile editor, `hidden md:block` shows desktop DnD layout.

---
- On 390px width, canvas hidden, step editor shown.
- Navigate through 5 steps, all changes persist.
- Back to desktop width → canvas restored with all changes.
- No content loss when switching between mobile/desktop mode.

**Verification:**
```bash
npx tsc --noEmit --pretty false
npx eslint src/components/site/canvas/mobile-step-editor.tsx src/components/site/canvas/canvas-editor.tsx
```

---

## Phase 4: Publish / Unpublish Toggle ✅

### Task 4.1: Add publish control to editor

**Objective:** Let users publish/unpublish their landing page with a visible toggle + readiness gate.

**Files:**
- Modify: `src/components/site/canvas/canvas-editor.tsx`
- May touch: `src/lib/actions/personal-site.ts`

**Implementation:**
- Add publish toggle switch in bottom bar or Publish step (mobile).
- When toggling ON → check readiness. If not ready, show issues list with "Perbaiki dulu" button.
- When ready → confirm dialog "Publikasikan halaman ini?" → set `published = true`.
- When toggling OFF → confirm "Sembunyikan halaman dari publik?" → set `published = false`.
- Show current status: green badge "Live" / gray badge "Draft".
- Public URL copy button next to status.

**Acceptance:**
- Toggle ON with incomplete site → blocked, shows readiness issues.
- Toggle ON with complete site → confirmed → site appears at `/site/[slug]`.
- Toggle OFF → site hidden, `/site/[slug]` shows 404.
- Status badge updates instantly.

**Verification:**
```bash
npx tsc --noEmit --pretty false
```

---

## Phase 5: Public Contact Form ✅

### Task 5.1: Add contact form to public landing page

**Objective:** Replace plain CTA button with a working contact form that sends to workspace owner.

**Files:**
- Create: `src/components/site/contact-form.tsx`
- Create: `src/app/site/[slug]/contact/route.ts` (API endpoint)
- Modify: `src/components/site/personal-site-renderer.tsx`
- May touch: `src/components/site/canvas/properties-panel.tsx` (form field config)

**Implementation:**
- Render a contact form section on the public page when CTA section has `contactForm: true`.
- Fields: name, email, message (all required), optional phone.
- Submit → `POST /site/[slug]/contact` → sends email to workspace owner via Resend.
- Success toast: "Pesan terkirim! Kami akan menghubungi Anda segera."
- Spam protection: honeypot field + rate limit (3/hour per IP).
- Admin: submissions appear in notification bell + optional forward to email.

**Acceptance:**
- Visitor fills form → submits → owner receives email.
- Rate limit blocks after 3/hour.
- Honeypot catches basic bots.

**Verification:**
```bash
npx tsc --noEmit --pretty false
npx eslint src/components/site/contact-form.tsx src/app/site/\[slug\]/contact/route.ts src/components/site/personal-site-renderer.tsx
```

---

## Phase 6: Mobile Canvas UX Polish ✅

### Task 6.1: Responsive canvas improvements

**Objective:** Make desktop canvas more usable on tablet + improve mobile touch targets.

**Files:**
- Modify: `src/components/site/canvas/canvas-editor.tsx`
- Modify: `src/components/site/canvas/canvas-renderer.tsx`
- Modify: `src/components/site/canvas/properties-panel.tsx`

**Implementation:**
- Properties panel: on tablet/mobile, render as bottom sheet instead of right panel.
- Section toolbar: larger touch targets (min 44px).
- Inline editing: double-tap to edit on mobile (prevent accidental edits while scrolling).
- Bottom bar: stack vertically on mobile instead of overflowing.
- Sidebar tabs: keep icons + labels, prevent text truncation at 390px.

**Acceptance:**
- No horizontal overflow at 390px or 768px.
- All buttons ≥ 44px touch targets.
- Properties panel opens as bottom sheet on tablet.
- Double-tap required to edit text on mobile.

**Verification:**
```bash
npx tsc --noEmit --pretty false
npx eslint src/components/site/canvas/canvas-editor.tsx src/components/site/canvas/canvas-renderer.tsx src/components/site/canvas/properties-panel.tsx
```

---

## Phase 7: Final QA + Dev Deploy ✅

### Task 7.1: Run full verification

```bash
npx eslint src/components/site/ src/lib/personal-site/ src/app/site/
npx vitest run src/components/site/ src/lib/personal-site/
npx tsc --noEmit --pretty false
npm run build
git diff --check
```

### Task 7.2: Deploy to dev only

```bash
bash /root/.hermes/shared-workspace/PRE_DEPLOY_CHECK.sh
BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
VCS_REF=$(git rev-parse --short HEAD) \
docker compose -f docker-compose.dev.yml up -d --build cubicle-dev
```

### Task 7.3: Browser QA flows

**Credentials:** Dev QA `alip.tester@cubiqlo.test` / `password123`

1. Login → open builder → drag section from sidebar to canvas.
2. Open Structure panel → reorder sections → verify canvas sync.
3. Switch to 390px → step editor appears → walk all 5 steps.
4. Complete readiness → toggle publish ON → verify `/site/[slug]` shows page.
5. Toggle publish OFF → verify page hidden.
6. Fill contact form → verify email arrives.
7. Test all 8 themes save & render correctly.
8. Mobile: verify no horizontal overflow, touch targets work.

---

## Priority Order

1. Phase 1 — Drag from sidebar
2. Phase 2 — Structure mini-map
3. Phase 3 — Mobile builder mode
4. Phase 4 — Publish toggle
5. Phase 5 — Contact form
6. Phase 6 — Mobile polish
7. Phase 7 — QA + dev deploy

---

## Definition of Done

- Drag section from sidebar to canvas position works on desktop.
- Structure panel shows reorderable section list synced with canvas.
- Mobile step editor covers all 5 editing stages at 390px width.
- Publish toggle gates on readiness, shows live/draft status.
- Public contact form sends email to workspace owner.
- Mobile canvas has no horizontal overflow, 44px touch targets.
- Dev deployed + verified; prod untouched until explicit approval.
