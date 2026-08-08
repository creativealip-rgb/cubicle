# Canvas WYSIWYG Site Builder — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Rebuild Cubiqlo's Personal Landing Page builder into a Google Sites-style canvas editor where users click widgets to add them, edit text inline, drag-drop to reorder, manage multiple pages, and customize themes — all on a live canvas preview.

**Architecture:** Replace the current form-based editor (builder-client.tsx + section-editor.tsx + personal-site-renderer.tsx) with a canvas-first editor. The canvas IS the editor — sections render as editable blocks. A left sidebar provides widget insertion. Top tabs switch between Pages, Insert, and Theme panels. The data model extends to support multi-page, richer section types, and theme customization. Public rendering uses the same canvas renderer in read-only mode.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS, @dnd-kit (drag-drop), zod (schema), contentEditable (inline text editing), existing personal-site model + actions.

---

## Phase 1: Data Model & Schema (Multi-page + Theme)

### Task 1.1: Extend PersonalSiteInput schema for multi-page

**Objective:** Add `pages` array to the site model, each page with its own sections.

**Files:**
- Modify: `src/lib/personal-site/model.ts`

**Step 1:** Add `PersonalSitePage` schema:

```typescript
const personalSitePageSchema = z.object({
  id: idSchema,
  slug: z.string().trim().min(1).max(48).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(100),
  isHome: z.boolean(),
  sections: z.array(personalSiteSectionSchema).max(12),
});
```

**Step 2:** Add `themeConfig` to `personalSiteInputSchema`:

```typescript
const themeConfigSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fontHeading: z.string().max(60).optional(),
  fontBody: z.string().max(60).optional(),
  headerStyle: z.enum(["full-width", "contained", "minimal"]).optional(),
  buttonStyle: z.enum(["rounded", "pill", "square"]).optional(),
});
```

**Step 3:** Add `pages` and `themeConfig` to `personalSiteInputSchema`:

```typescript
pages: z.array(personalSitePageSchema).max(10).optional(),
themeConfig: themeConfigSchema.optional(),
```

**Step 4:** Update `DEFAULT_PERSONAL_SITE` to include a default home page:

```typescript
pages: [{
  id: "home",
  slug: "",
  title: "Home",
  isHome: true,
  sections: [...], // existing default sections
}],
themeConfig: {
  primaryColor: "#6647F0",
  secondaryColor: "#1e293b",
  backgroundColor: "#ffffff",
  textColor: "#111827",
  headerStyle: "full-width",
  buttonStyle: "rounded",
},
```

**Step 5:** Update `normalizeStoredPersonalSite` to migrate old single-page sites to `pages` format.

**Step 6:** Run `npx tsc --noEmit`, commit.

---

### Task 1.2: Add new section types to schema

**Objective:** Add `spacer`, `tableOfContents`, and `contentBlock` (multi-column layout) section types.

**Files:**
- Modify: `src/lib/personal-site/model.ts`

**Step 1:** Add to `PERSONAL_SITE_SECTION_TYPES`:

```typescript
"spacer",
"tableOfContents",
"contentBlock",
```

**Step 2:** Add schemas:

```typescript
z.object({
  id: idSchema,
  type: z.literal("spacer"),
  heading: headingSchema,
  height: z.number().min(16).max(200).optional(), // px
}),
z.object({
  id: idSchema,
  type: z.literal("tableOfContents"),
  heading: headingSchema,
}),
z.object({
  id: idSchema,
  type: z.literal("contentBlock"),
  heading: headingSchema,
  columns: z.number().min(2).max(4),
  layout: z.enum(["equal", "left-heavy", "right-heavy", "thirds"]),
  items: z.array(z.object({
    id: idSchema,
    content: z.string().trim().max(2_000),
  })).max(4),
}),
```

**Step 3:** Update `sectionHasContent` for new types.

**Step 4:** Run `npx tsc --noEmit`, commit.

---

## Phase 2: Canvas Renderer (Editable Mode)

### Task 2.1: Create CanvasSection wrapper component

**Objective:** A wrapper that makes any section selectable, draggable, and shows a toolbar on hover/select.

**Files:**
- Create: `src/components/site/canvas/canvas-section.tsx`

**Step 1:** Create `CanvasSection` component:

```tsx
"use client";
import { useState } from "react";
import { GripVertical, Copy, Trash2, ChevronUp, ChevronDown } from "lucide-react";

type Props = {
  id: string;
  selected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  children: React.ReactNode;
};

export function CanvasSection({ id, selected, onSelect, onMoveUp, onMoveDown, onDuplicate, onDelete, children }: Props) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      data-section-id={id}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative group transition-[outline] ${selected ? "outline-2 outline-primary outline-offset-2" : "outline-transparent"}`}
    >
      {(hovered || selected) && (
        <div className="absolute -top-3 right-2 z-20 flex items-center gap-1 rounded-lg border bg-background px-1 py-0.5 shadow-sm">
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-1 hover:bg-muted rounded"><ChevronUp className="h-3 w-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-1 hover:bg-muted rounded"><ChevronDown className="h-3 w-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1 hover:bg-muted rounded"><Copy className="h-3 w-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:bg-muted rounded text-destructive"><Trash2 className="h-3 w-3" /></button>
          <div className="cursor-grab p-1 hover:bg-muted rounded"><GripVertical className="h-3 w-3" /></div>
        </div>
      )}
      {children}
    </div>
  );
}
```

**Step 2:** Commit.

---

### Task 2.2: Create InlineText component for contentEditable editing

**Objective:** A component that renders text as contentEditable, emits changes on blur.

**Files:**
- Create: `src/components/site/canvas/inline-text.tsx`

**Step 1:** Create `InlineText` component:

```tsx
"use client";
import { useRef, useEffect } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  tag?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  placeholder?: string;
};

export function InlineText({ value, onChange, tag: Tag = "p", className = "", placeholder = "Click to edit..." }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value]);

  return (
    <Tag
      ref={ref as any}
      contentEditable
      suppressContentEditableWarning
      className={`${className} outline-none focus:ring-1 focus:ring-primary/30 rounded px-1 -mx-1 cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50`}
      data-placeholder={placeholder}
      onBlur={(e) => onChange(e.currentTarget.textContent || "")}
    />
  );
}
```

**Step 2:** Commit.

---

### Task 2.3: Create editable Canvas renderer

**Objective:** Replace PersonalSiteRenderer with an editable version that uses CanvasSection + InlineText.

**Files:**
- Create: `src/components/site/canvas/canvas-renderer.tsx`

**Step 1:** Create `CanvasRenderer` component that:
- Renders hero section with InlineText for title, subtitle, hero text
- Renders each section wrapped in CanvasSection
- Each section type renders with editable fields (InlineText for text, inline inputs for structured data)
- Selected section shows a properties panel

**Step 2:** For each section type, create editable variants:
- `EditableServices` — service cards with InlineText
- `EditableProcess` — steps with InlineText
- `EditablePricing` — offer cards with InlineText
- `EditablePortfolio` — project cards with InlineText
- `EditableTestimonials` — quotes with InlineText
- `EditableFaq` — accordion items with InlineText
- `EditableContact` — contact methods with InlineText
- `EditableCustom` — free text with InlineText
- `EditableGallery` — image grid with URL inputs
- `EditableEmbed` — iframe preview with URL input
- `EditableSocial` — social links with platform selector
- `EditableCta` — CTA block with InlineText
- `EditableDivider` — visual separator
- `EditableCollapsible` — accordion with InlineText
- `EditableSpacer` — spacer with height slider
- `EditableTableOfContents` — auto-generated from sections
- `EditableContentBlock` — multi-column with InlineText

**Step 3:** Commit.

---

### Task 2.4: Create CanvasEditor main component

**Objective:** The main editor that combines canvas, sidebar, and tabs.

**Files:**
- Create: `src/components/site/canvas/canvas-editor.tsx`

**Step 1:** Create layout structure:

```tsx
<div className="flex h-screen">
  {/* Left sidebar — widget panel */}
  <aside className="w-72 border-r bg-background overflow-y-auto">
    {/* Tabs: Insert | Pages | Theme */}
  </aside>
  
  {/* Canvas area */}
  <main className="flex-1 overflow-y-auto bg-muted/30 p-8">
    <div className="mx-auto max-w-5xl bg-background shadow-sm rounded-xl overflow-hidden">
      {/* Hero section */}
      {/* Page sections */}
      {/* Add section button */}
    </div>
  </main>
  
  {/* Right properties panel (when section selected) */}
  {selectedSection && (
    <aside className="w-80 border-l bg-background overflow-y-auto">
      {/* Section properties */}
    </aside>
  )}
</div>
```

**Step 2:** Implement state management:
- `selectedSectionId` — which section is selected
- `editingField` — which field is being edited
- `site` — current site state (lifted from builder-client)
- `currentPageId` — which page is being edited

**Step 3:** Commit.

---

## Phase 3: Sidebar — Insert Panel

### Task 3.1: Create InsertPanel with widget list

**Objective:** Sidebar panel that shows available widgets, click to add to canvas.

**Files:**
- Create: `src/components/site/canvas/insert-panel.tsx`

**Step 1:** Create widget definitions:

```typescript
const widgets = [
  { type: "services", label: "Layanan", icon: Briefcase, category: "content" },
  { type: "process", label: "Proses", icon: ListOrdered, category: "content" },
  { type: "pricing", label: "Harga", icon: DollarSign, category: "content" },
  { type: "portfolio", label: "Portofolio", icon: FolderOpen, category: "content" },
  { type: "testimonials", label: "Testimoni", icon: MessageSquareQuote, category: "content" },
  { type: "faq", label: "FAQ", icon: HelpCircle, category: "content" },
  { type: "contact", label: "Kontak", icon: Mail, category: "content" },
  { type: "custom", label: "Teks", icon: Type, category: "basic" },
  { type: "gallery", label: "Galeri", icon: Images, category: "media" },
  { type: "embed", label: "Embed", icon: Code, category: "media" },
  { type: "social", label: "Sosial", icon: Share2, category: "basic" },
  { type: "cta", label: "Tombol CTA", icon: MousePointerClick, category: "basic" },
  { type: "divider", label: "Pemisah", icon: Minus, category: "basic" },
  { type: "spacer", label: "Spasi", icon: ArrowUpDown, category: "basic" },
  { type: "collapsible", label: "Accordion", icon: ChevronDown, category: "content" },
  { type: "tableOfContents", label: "Daftar Isi", icon: List, category: "navigation" },
  { type: "contentBlock", label: "Blok Multi-Kolom", icon: Columns, category: "layout" },
] as const;
```

**Step 2:** Create `InsertPanel` with categorized widget grid. Click widget → calls `onAddSection(type)`.

**Step 3:** Create content block templates (2-col, 3-col, 4-col layouts).

**Step 4:** Commit.

---

### Task 3.2: Create PagesPanel for multi-page management

**Objective:** Sidebar panel to add/delete/reorder pages.

**Files:**
- Create: `src/components/site/canvas/pages-panel.tsx`

**Step 1:** Create `PagesPanel`:
- List pages with drag-to-reorder
- Add page button
- Delete page (with confirmation, can't delete last page)
- Rename page (inline edit)
- Set home page
- Page slug auto-generated from title

**Step 2:** Commit.

---

### Task 3.3: Create ThemePanel for theme customization

**Objective:** Sidebar panel to customize colors, fonts, header/button styles.

**Files:**
- Create: `src/components/site/canvas/theme-panel.tsx`

**Step 1:** Create `ThemePanel`:
- Color pickers: primary, secondary, background, text
- Font selector: heading font, body font (Google Fonts subset)
- Header style: full-width / contained / minimal (visual radio)
- Button style: rounded / pill / square (visual radio)
- Preset themes: Midnight, Paper, Studio (existing) + new ones
- Live preview updates as user changes

**Step 2:** Commit.

---

## Phase 4: Drag & Drop

### Task 4.1: Add @dnd-kit for section reordering

**Objective:** Sections can be dragged to reorder on canvas.

**Files:**
- Modify: `src/components/site/canvas/canvas-renderer.tsx`

**Step 1:** Install `@dnd-kit/core` and `@dnd-kit/sortable`.

**Step 2:** Wrap sections in `DndContext` + `SortableContext`.

**Step 3:** Make CanvasSection draggable via `useSortable`.

**Step 4:** Handle `onDragEnd` to reorder sections array.

**Step 5:** Commit.

---

## Phase 5: Inline Editing Integration

### Task 5.1: Wire InlineText to site state updates

**Objective:** Editing text on canvas updates the site state, which flows to preview and save.

**Files:**
- Modify: `src/components/site/canvas/canvas-renderer.tsx`
- Modify: `src/components/site/canvas/canvas-editor.tsx`

**Step 1:** Pass `onUpdateSection(sectionId, patch)` callback through the tree.

**Step 2:** Each InlineText calls `onUpdateSection` on blur with the field update.

**Step 3:** Structured fields (pricing, gallery URLs, etc.) use inline Input/Select components.

**Step 4:** Debounce state updates for smooth UX.

**Step 5:** Commit.

---

### Task 5.2: Properties panel for selected section

**Objective:** When a section is selected, show a right-side panel with detailed properties.

**Files:**
- Create: `src/components/site/canvas/properties-panel.tsx`

**Step 1:** Create `PropertiesPanel` that renders the appropriate form for the selected section type.

**Step 2:** Reuse field definitions from section-editor.tsx but styled for the panel.

**Step 3:** Changes in the panel update the same state as inline editing.

**Step 4:** Commit.

---

## Phase 6: Wire to Existing Backend

### Task 6.1: Update save action for multi-page

**Objective:** The existing `savePersonalSite` action handles the new `pages` and `themeConfig` fields.

**Files:**
- Modify: `src/lib/actions/personal-site.ts`
- Modify: `src/lib/personal-site/model.ts`

**Step 1:** Update `normalizeStoredPersonalSite` to handle `pages` array (backward compatible).

**Step 2:** Update the save action to serialize `pages` and `themeConfig`.

**Step 3:** Update the public page route `src/app/site/[slug]/page.tsx` to render multi-page sites.

**Step 4:** Commit.

---

### Task 6.2: Update public renderer for multi-page

**Objective:** Public site renders pages with navigation between them.

**Files:**
- Modify: `src/components/site/personal-site-renderer.tsx`
- Modify: `src/app/site/[slug]/page.tsx`

**Step 1:** Add page navigation (header links or sidebar) when site has multiple pages.

**Step 2:** Route `/site/{slug}/{page-slug}` renders specific page.

**Step 3:** Home page renders at `/site/{slug}`.

**Step 4:** Apply `themeConfig` to public rendering (colors, fonts, header/button styles).

**Step 5:** Commit.

---

## Phase 7: Replace Old Builder

### Task 7.1: Replace builder-client.tsx with canvas editor

**Objective:** Swap the old form-based builder with the new canvas editor.

**Files:**
- Modify: `src/app/(app)/app/personal-site/page.tsx`
- Modify: `src/components/site/builder-client.tsx`

**Step 1:** Update the page to use `CanvasEditor` instead of `BuilderClient`.

**Step 2:** Keep the same save action and public URL structure.

**Step 3:** Remove old form-based section-editor.tsx (or keep as fallback).

**Step 4:** Commit.

---

### Task 7.2: Mobile responsive canvas editor

**Objective:** Canvas editor works on mobile with a simplified layout.

**Files:**
- Modify: `src/components/site/canvas/canvas-editor.tsx`

**Step 1:** On mobile: full-width canvas, bottom sheet for sidebar/properties.

**Step 2:** Simplified toolbar (no drag-drop, use up/down buttons instead).

**Step 3:** Commit.

---

## Phase 8: Polish & QA

### Task 8.1: Keyboard shortcuts

**Objective:** Common shortcuts for power users.

**Step 1:** `Ctrl+Z` / `Ctrl+Y` — undo/redo
**Step 2:** `Delete` — delete selected section
**Step 3:** `Ctrl+D` — duplicate selected section
**Step 4:** `Escape` — deselect
**Step 5:** Commit.

---

### Task 8.2: Auto-save + dirty state

**Objective:** Auto-save changes after 2s of inactivity, show dirty indicator.

**Step 1:** Debounced auto-save (2s after last change).
**Step 2:** Show "Saving..." / "Saved" / "Unsaved changes" indicator.
**Step 3:** Warn before leaving page with unsaved changes.
**Step 4:** Commit.

---

### Task 8.3: Image upload integration

**Objective:** Gallery and hero sections support image upload (not just URLs).

**Step 1:** Add image upload button next to URL inputs.
**Step 2:** Upload to existing R2 storage.
**Step 3:** Return URL to the field.
**Step 4:** Commit.

---

## Summary

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| 1. Data Model | 2 | 1h |
| 2. Canvas Renderer | 4 | 3h |
| 3. Sidebar Panels | 3 | 2h |
| 4. Drag & Drop | 1 | 1h |
| 5. Inline Editing | 2 | 2h |
| 6. Backend Wiring | 2 | 1.5h |
| 7. Replace Old Builder | 2 | 1h |
| 8. Polish & QA | 3 | 1.5h |
| **Total** | **19** | **~13h** |

## Dependencies

- `@dnd-kit/core` + `@dnd-kit/sortable` — drag-drop
- Existing: `zod`, `lucide-react`, `tailwindcss`, `@radix-ui/*`
- No new database migrations needed (pages stored in existing JSON column)

## Risks

- **contentEditable quirks** — browser inconsistencies with inline editing. Mitigate with onBlur sync + controlled fallback.
- **Performance** — re-rendering full canvas on every keystroke. Mitigate with React.memo + debounced updates.
- **Mobile UX** — canvas editing on small screens is hard. Simplify to form-based on mobile.
