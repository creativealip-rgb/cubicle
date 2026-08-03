# Landing Page Builder Usability Improvements — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make Cubiqlo landing page creation faster for non-technical users by adding ready-made templates, guided editing, AI-assisted copy, preview tools, and publish readiness checks.

**Architecture:** Extend the existing canvas builder instead of replacing it. Keep the canvas as the main editor, add reusable template catalogs and helper panels around it, then wire public/preview validation through existing `PersonalSiteInput`, `savePersonalSite`, and `/site/*` routes.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS, existing canvas components, existing personal-site model/actions, existing AI provider abstraction where available.

---

## Current Baseline

Existing files and behavior verified on dev:

- Builder route: `src/app/(app)/app/personal-site/page.tsx`
- Main editor: `src/components/site/canvas/canvas-editor.tsx`
- Canvas renderer: `src/components/site/canvas/canvas-renderer.tsx`
- Public renderer: `src/components/site/personal-site-renderer.tsx`
- Model/schema: `src/lib/personal-site/model.ts`
- Save action: `src/lib/actions/personal-site.ts`
- Public pages:
  - `src/app/site/[slug]/page.tsx`
  - `src/app/site/[slug]/[pageSlug]/page.tsx`
- Image upload: `src/components/site/canvas/image-upload.tsx`
- Current builder supports Insert, Pages, Theme, multi-page public route, theme persistence, section reorder, hero image, auto-save.

Known gap to preserve/verify:

- Existing lint warning in `src/components/site/personal-site-renderer.tsx` for `<img>` is accepted for now unless image optimization becomes part of a later pass.

---

## Phase 1: Section Starter Templates

### Task 1.1: Create section template catalog

**Objective:** Add reusable prefilled section templates so users do not start from empty widgets.

**Files:**

- Create: `src/lib/personal-site/section-templates.ts`
- Modify: `src/lib/personal-site/model.ts` only if missing exported section types are needed.

**Implementation:**

Create a typed catalog:

```ts
import type { PersonalSiteSection } from "@/lib/personal-site/model";

export type SectionTemplate = {
  id: string;
  type: PersonalSiteSection["type"];
  label: string;
  description: string;
  category: "hero" | "content" | "conversion" | "proof" | "media" | "layout";
  build: () => PersonalSiteSection;
};

function makeId(prefix = "s") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    id: "services-3-cards",
    type: "services",
    label: "Layanan 3 Kartu",
    description: "Tiga layanan utama dengan manfaat singkat.",
    category: "content",
    build: () => ({
      id: makeId(),
      type: "services",
      heading: "Layanan yang bisa kamu pilih",
      items: [
        { id: makeId("item"), title: "Strategi", description: "Riset kebutuhan dan susun arah kerja yang jelas." },
        { id: makeId("item"), title: "Eksekusi", description: "Bangun solusi dengan milestone dan review rutin." },
        { id: makeId("item"), title: "Optimasi", description: "Ukur hasil, perbaiki bottleneck, dan tingkatkan performa." },
      ],
    }),
  },
  {
    id: "pricing-3-packages",
    type: "pricing",
    label: "Pricing 3 Paket",
    description: "Paket Basic, Growth, dan Premium.",
    category: "conversion",
    build: () => ({
      id: makeId(),
      type: "pricing",
      heading: "Paket kerja sama",
      offers: [
        { id: makeId("offer"), name: "Basic", price: "Mulai Rp2.500.000", description: "Cocok untuk validasi cepat dan scope kecil." },
        { id: makeId("offer"), name: "Growth", price: "Mulai Rp7.500.000", description: "Untuk bisnis yang butuh sistem rapi dan siap jalan." },
        { id: makeId("offer"), name: "Premium", price: "Custom", description: "Untuk kebutuhan kompleks, integrasi, dan pendampingan." },
      ],
    }),
  },
  {
    id: "faq-5-items",
    type: "faq",
    label: "FAQ 5 Pertanyaan",
    description: "Pertanyaan umum sebelum calon klien kontak.",
    category: "conversion",
    build: () => ({
      id: makeId(),
      type: "faq",
      heading: "Pertanyaan umum",
      items: [
        { id: makeId("faq"), question: "Berapa lama proses pengerjaan?", answer: "Tergantung scope. Project kecil biasanya 1-2 minggu, project kompleks dibuat per milestone." },
        { id: makeId("faq"), question: "Apakah bisa konsultasi dulu?", answer: "Bisa. Kita mulai dari diskusi kebutuhan agar scope dan estimasi jelas." },
        { id: makeId("faq"), question: "Apakah revisi termasuk?", answer: "Ya, revisi mengikuti paket atau kesepakatan di proposal." },
        { id: makeId("faq"), question: "Metode pembayarannya bagaimana?", answer: "Umumnya memakai DP dan pelunasan per milestone." },
        { id: makeId("faq"), question: "Apakah dapat file/source akhir?", answer: "Ya, aset final diserahkan sesuai scope project." },
      ],
    }),
  },
];
```

**Verification:**

Run:

```bash
npx tsc --noEmit --pretty false
```

Expected: exit 0.

---

### Task 1.2: Replace empty widget add with template-aware add

**Objective:** Let users choose starter templates from the Insert tab while preserving quick empty widgets.

**Files:**

- Modify: `src/components/site/canvas/canvas-editor.tsx`
- Import: `SECTION_TEMPLATES` from `src/lib/personal-site/section-templates.ts`

**Implementation notes:**

- Keep existing `WIDGET_LIST` for empty widgets.
- Add a new “Starter Blocks” group above current widget categories.
- Clicking a template should insert `template.build()` into the active page.
- Keep mobile sidebar behavior: after inserting, close mobile sidebar.

**Acceptance criteria:**

- Insert tab shows at least:
  - `Layanan 3 Kartu`
  - `Pricing 3 Paket`
  - `FAQ 5 Pertanyaan`
- Clicking each adds prefilled content to current active page.
- Save and refresh preserve inserted sections.

**Verification:**

Run:

```bash
npx eslint src/components/site/canvas/canvas-editor.tsx src/lib/personal-site/section-templates.ts
npx tsc --noEmit --pretty false
```

Expected: exit 0.

---

## Phase 2: Full Page Templates

### Task 2.1: Create page template catalog

**Objective:** Add one-click full landing page structures for common use cases.

**Files:**

- Create: `src/lib/personal-site/page-templates.ts`
- Reuse builders from `src/lib/personal-site/section-templates.ts` where possible.

**Template types:**

- `Freelancer Profile`
- `Agency Website`
- `Service Offer`
- `Portfolio`
- `Lead Generation`

**Implementation shape:**

```ts
import type { PersonalSiteInput, PersonalSiteSection } from "@/lib/personal-site/model";
import { SECTION_TEMPLATES } from "./section-templates";

export type PageTemplate = {
  id: string;
  label: string;
  description: string;
  build: (site: PersonalSiteInput) => Partial<PersonalSiteInput>;
};

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "freelancer-profile",
    label: "Freelancer Profile",
    description: "Profil singkat, layanan, proses, portfolio, dan CTA.",
    build: (site) => ({
      title: site.title || "Nama atau Studio Kamu",
      subtitle: "Freelancer · Studio · Consultant",
      hero: "Bantu bisnis tampil lebih rapi, dipercaya, dan siap menerima klien baru.",
      about: "Ceritakan siapa kamu, siapa yang kamu bantu, dan hasil utama yang biasa kamu berikan.",
      ctaLabel: "Konsultasi Sekarang",
      sections: buildSections(["services-3-cards", "faq-5-items"]),
      pages: [{ id: "home", slug: "", title: "Home", isHome: true, sections: buildSections(["services-3-cards", "faq-5-items"]) }],
    }),
  },
];

function buildSections(ids: string[]): PersonalSiteSection[] {
  return ids
    .map((id) => SECTION_TEMPLATES.find((item) => item.id === id)?.build())
    .filter(Boolean) as PersonalSiteSection[];
}
```

**Verification:**

Run:

```bash
npx tsc --noEmit --pretty false
```

Expected: exit 0.

---

### Task 2.2: Add Templates tab to canvas sidebar

**Objective:** Add a sidebar tab for applying full-page templates.

**Files:**

- Modify: `src/components/site/canvas/canvas-editor.tsx`
- Import: `PAGE_TEMPLATES`

**Implementation notes:**

- Add fourth tab: `Templates`.
- Show template cards with label + description.
- Clicking template should show a confirmation if current page/site has content.
- Use existing confirmation component if available; otherwise use a small inline confirm state inside sidebar.
- Applying a template updates site title/subtitle/hero/about/cta/sections/pages.
- Preserve current `slug`, `published`, `links`, and current `themeConfig` unless template explicitly changes it.

**Acceptance criteria:**

- User can apply `Freelancer Profile` template.
- Home page sections replaced by template sections.
- Existing theme colors remain unchanged.
- Save/refresh keeps template content.

**Verification:**

Run:

```bash
npx eslint src/components/site/canvas/canvas-editor.tsx src/lib/personal-site/page-templates.ts
npx tsc --noEmit --pretty false
```

Expected: exit 0.

---

## Phase 3: Quick Edit Properties Panel

### Task 3.1: Create selected-section properties panel shell

**Objective:** Add a right sidebar panel for structured editing of selected section fields.

**Files:**

- Create: `src/components/site/canvas/properties-panel.tsx`
- Modify: `src/components/site/canvas/canvas-editor.tsx`

**Implementation notes:**

- Panel appears on desktop when `selectedSectionId` is not null.
- Mobile: expose panel through bottom/side sheet later; for this phase, desktop first.
- Props:

```ts
type PropertiesPanelProps = {
  section: PersonalSiteSection | null;
  onUpdate: (patch: Partial<PersonalSiteSection>) => void;
  onClose: () => void;
};
```

- Start with shared controls:
  - Heading
  - Animation
  - Duplicate/Delete shortcuts can stay in canvas toolbar.

**Acceptance criteria:**

- Clicking a section opens panel.
- Editing heading in panel updates canvas immediately.
- Closing panel deselects section.

**Verification:**

Run:

```bash
npx eslint src/components/site/canvas/properties-panel.tsx src/components/site/canvas/canvas-editor.tsx
npx tsc --noEmit --pretty false
```

Expected: exit 0.

---

### Task 3.2: Add structured item editing for common sections

**Objective:** Make complex sections easier to edit than inline-only editing.

**Files:**

- Modify: `src/components/site/canvas/properties-panel.tsx`

**Support first:**

- `services`: add/remove service cards, edit title/description.
- `pricing`: add/remove offers, edit name/price/description.
- `faq`: add/remove FAQ items, edit question/answer.
- `cta`: edit text, button label, button URL.
- `gallery`: edit URL/alt and reuse `ImageUpload` if simple.

**Acceptance criteria:**

- Add/remove item buttons work.
- Changes update canvas immediately.
- Save/refresh preserves structured edits.

**Verification:**

Run:

```bash
npx eslint src/components/site/canvas/properties-panel.tsx
npx tsc --noEmit --pretty false
```

Expected: exit 0.

---

## Phase 4: AI Copy Generator

### Task 4.1: Add server action/API for landing copy generation

**Objective:** Generate section copy from user context using existing AI provider setup.

**Files:**

- Create: `src/lib/actions/personal-site-ai.ts`
- Modify only if needed: existing AI provider helpers under `src/lib/*ai*` after inspection.

**Inputs:**

```ts
type GenerateLandingCopyInput = {
  sectionType: PersonalSiteSection["type"];
  businessName: string;
  niche: string;
  targetAudience: string;
  offer: string;
  tone: "professional" | "friendly" | "bold" | "minimal";
};
```

**Rules:**

- Return structured JSON matching section type.
- Validate with Zod before returning to client.
- If AI env missing, return clear error: `AI belum dikonfigurasi di environment ini.`
- Never overwrite existing section without user click.

**Acceptance criteria:**

- API/action validates bad input.
- Good input returns section patch for at least `services`, `faq`, `cta`.
- Failure shows friendly toast.

**Verification:**

Run:

```bash
npx tsc --noEmit --pretty false
```

Expected: exit 0.

---

### Task 4.2: Add Generate Copy button in properties panel

**Objective:** Let users generate copy for selected section.

**Files:**

- Modify: `src/components/site/canvas/properties-panel.tsx`
- Modify: `src/components/site/canvas/canvas-editor.tsx` if action needs callback plumbing.

**UX:**

- Button: `Generate copy`
- Small fields:
  - niche
  - target audience
  - offer
  - tone
- Show loading state.
- Show preview result before apply OR apply directly only to empty fields.

**Acceptance criteria:**

- Services section can generate 3 service cards.
- FAQ section can generate 5 FAQ items.
- CTA section can generate text + button label.
- Existing non-empty content is not overwritten without explicit Apply.

**Verification:**

Run:

```bash
npx eslint src/components/site/canvas/properties-panel.tsx
npx tsc --noEmit --pretty false
```

Expected: exit 0.

---

## Phase 5: Preview Device Switcher

### Task 5.1: Add canvas viewport switcher

**Objective:** Let users preview desktop/tablet/mobile widths inside editor.

**Files:**

- Modify: `src/components/site/canvas/canvas-editor.tsx`
- Modify: `src/components/site/canvas/canvas-renderer.tsx` only if width handling needs prop.

**UX:**

- Add buttons in bottom bar or top of canvas:
  - Desktop
  - Tablet
  - Mobile
- Canvas width changes:
  - Desktop: `max-w-5xl`
  - Tablet: `max-w-3xl`
  - Mobile: `max-w-[390px]`

**Acceptance criteria:**

- Toggle changes canvas width without losing unsaved edits.
- Mobile preview shows same content and no horizontal overflow.

**Verification:**

Run:

```bash
npx eslint src/components/site/canvas/canvas-editor.tsx src/components/site/canvas/canvas-renderer.tsx
npx tsc --noEmit --pretty false
```

Expected: exit 0.

---

## Phase 6: Publish Readiness Checklist

### Task 6.1: Add readiness evaluation helper

**Objective:** Warn users before publish if landing page is incomplete.

**Files:**

- Create: `src/lib/personal-site/readiness.ts`
- Add tests: `src/lib/personal-site/readiness.test.ts`

**Checks:**

- Slug valid.
- Title filled.
- Hero filled.
- CTA label + URL paired when published.
- At least one contact link or CTA URL exists.
- At least one content section has content.
- Theme config exists.
- Public page can have SEO title/description after Phase 7.

**Implementation shape:**

```ts
export type ReadinessIssue = {
  id: string;
  severity: "error" | "warning";
  label: string;
};

export function getPersonalSiteReadiness(site: PersonalSiteInput): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  // checks here
  return issues;
}
```

**Verification:**

Run:

```bash
npx vitest run src/lib/personal-site/readiness.test.ts
npx tsc --noEmit --pretty false
```

Expected: tests pass, typecheck exit 0.

---

### Task 6.2: Show publish checklist in editor

**Objective:** Display readiness status and actionable issues.

**Files:**

- Modify: `src/components/site/canvas/canvas-editor.tsx`
- Import: `getPersonalSiteReadiness`

**UX:**

- Add small status near bottom bar or sidebar:
  - `Ready to publish` when no error.
  - `3 things to fix` when issues exist.
- Clicking opens issue list.
- Error items use clear labels, not technical schema messages.

**Acceptance criteria:**

- Empty/default site shows warnings.
- Complete site shows ready badge.
- Badge updates live as content changes.

**Verification:**

Run:

```bash
npx eslint src/components/site/canvas/canvas-editor.tsx src/lib/personal-site/readiness.ts
npx vitest run src/lib/personal-site/readiness.test.ts
npx tsc --noEmit --pretty false
```

Expected: exit 0.

---

## Phase 7: SEO and Share Settings

### Task 7.1: Extend model for SEO/share metadata

**Objective:** Let users control title/description/social preview for landing pages.

**Files:**

- Modify: `src/lib/personal-site/model.ts`
- Modify: `src/db/schema.ts` only if top-level DB columns are chosen. Prefer JSON under existing site data first if feasible.

**Fields:**

```ts
seo: z.object({
  title: z.string().trim().max(80).optional(),
  description: z.string().trim().max(180).optional(),
  ogImage: z.string().trim().max(2_000).optional(),
}).optional()
```

**Acceptance criteria:**

- Existing records with no `seo` still parse.
- Save action preserves `seo`.
- Public metadata uses `seo.title ?? site.title` and `seo.description ?? site.hero`.

**Verification:**

Run:

```bash
npx tsc --noEmit --pretty false
```

Expected: exit 0.

---

### Task 7.2: Add SEO/share settings panel

**Objective:** Make social preview fields editable inside builder.

**Files:**

- Modify: `src/components/site/canvas/canvas-editor.tsx`
- Optionally create: `src/components/site/canvas/seo-panel.tsx`
- Modify metadata routes:
  - `src/app/site/[slug]/page.tsx`
  - `src/app/site/[slug]/[pageSlug]/page.tsx`

**UX:**

- Add sidebar tab or section under Theme: `SEO`
- Fields:
  - SEO title
  - Meta description
  - OG image URL/upload
- Show simple WhatsApp preview card.

**Verification:**

Run:

```bash
npx eslint src/components/site/canvas/canvas-editor.tsx src/app/site/[slug]/page.tsx src/app/site/[slug]/[pageSlug]/page.tsx
npx tsc --noEmit --pretty false
```

Expected: exit 0.

---

## Phase 8: Final QA and Dev Deployment

### Task 8.1: Run full local verification

**Objective:** Prove implementation builds and key regressions are clean before deploy.

**Commands:**

```bash
npx eslint src/components/site/canvas src/lib/personal-site src/app/site
npx vitest run src/lib/personal-site/model.test.ts src/lib/personal-site/readiness.test.ts
npx tsc --noEmit --pretty false
npm run build
git diff --check
```

**Expected:**

- exit 0 for all commands.
- Only accepted warning: existing `<img>` warning if not fixed.

---

### Task 8.2: Deploy to dev only

**Objective:** Publish changes to `dev.cubiqlo.com` without touching prod.

**Pre-deploy requirements:**

- Read `/root/.hermes/shared-workspace/DEPLOYMENT_GUARDRAILS.md`.
- Read `/root/.hermes/shared-workspace/DEPLOY_RULES.md`.
- Run:

```bash
bash /root/.hermes/shared-workspace/PRE_DEPLOY_CHECK.sh
```

**Deploy command:**

```bash
BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
VCS_REF=$(git rev-parse --short HEAD)-landing-usability \
docker compose -f docker-compose.dev.yml up -d --build cubicle-dev
```

**Expected:**

- `cubicle-dev` healthy.
- 80/443 still owned only by `dokploy-traefik`.
- `https://dev.cubiqlo.com/app/personal-site` redirects unauthenticated to login and renders after QA login.

---

### Task 8.3: Browser QA flows

**Objective:** Verify improvements using real browser behavior.

**Credentials:**

- Dev QA: `alip.tester@cubiqlo.test` / `password123`

**Flows:**

1. Login and open `/app/personal-site`.
2. Apply `Freelancer Profile` page template.
3. Add `FAQ 5 Pertanyaan` starter block.
4. Add second page, rename it, set home back/forth, reorder pages.
5. Edit section in properties panel.
6. Generate copy for one section if AI env available; if not, verify friendly error.
7. Switch preview Desktop/Tablet/Mobile.
8. Fill readiness checklist until badge is ready.
9. Save, refresh, verify content persists.
10. Visit public `/site/[slug]` and `/site/[slug]/[pageSlug]`, verify nav and theme.

**Acceptance:**

- No application error page.
- No console runtime errors.
- Save/refresh persists template, theme, pages, and metadata.
- Public routes render correct page content.

---

## Priority Order

If time is limited, implement in this order:

1. Phase 1 — Section starter templates
2. Phase 2 — Full page templates
3. Phase 3 — Quick edit properties panel
4. Phase 5 — Preview device switcher
5. Phase 6 — Publish readiness checklist
6. Phase 7 — SEO/share settings
7. Phase 4 — AI copy generator

Reason: templates + quick edit deliver immediate usability wins even without AI.

---

## Definition of Done

- Starter blocks available and usable.
- At least 3 full page templates available.
- Properties panel edits common section types.
- Device preview switcher works.
- Publish checklist visible and live-updating.
- SEO/share fields saved and used in public metadata.
- AI copy generator either works or fails gracefully when env is missing.
- Dev deployment verified on `dev.cubiqlo.com`.
- No prod deployment unless Alip explicitly approves.
