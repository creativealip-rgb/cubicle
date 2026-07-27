# Compact Notes and Journal Implementation Plan

> **For Hermes:** Implement task-by-task and verify each layer.

**Goal:** Convert Notes to Todoist compact rows and Journal to a separate compact timeline.

**Architecture:** Keep current routes, DB schema, and server actions. Change only page composition and client list presentation, preserving existing forms and operations behind expandable rows.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Tailwind, shadcn UI, Vitest.

---

### Task 1: Add compact UI wiring test

**Files:**
- Modify: `src/lib/meeting-revision-wiring.test.ts`

Assert Notes uses compact list markers, removes duplicate controls, and Journal has compact timeline markers.

### Task 2: Compact Notes page shell

**Files:**
- Modify: `src/app/(app)/app/personal/page.tsx`

Place title and primary create control together, compact filter/search toolbar, remove list wrapper card, and keep create form collapsible.

### Task 3: Compact Notes rows

**Files:**
- Modify: `src/components/notes/notes-list-client.tsx`

Render border-separated Todoist rows with a circular status action, one-line body preview, concise due metadata, and expandable detail/actions.

### Task 4: Compact Journal page shell and rows

**Files:**
- Modify: `src/app/(app)/app/journal/page.tsx`
- Modify: `src/components/journal/journal-list.tsx`

Use compact toolbar and date-led timeline rows. Keep journal semantics separate from task-like notes.

### Task 5: Verify and deploy

Run:
- `npx vitest run src/lib/meeting-revision-wiring.test.ts`
- `npx tsc --noEmit`
- `npm run build`

Then commit, push `main`, run deployment guardrails, build versioned Docker image, recreate app container, and verify health plus live HTTP response.
