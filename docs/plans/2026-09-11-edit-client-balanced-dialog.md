# Edit Client Balanced Dialog Implementation Plan

> **For Hermes:** Implement directly with TDD; user explicitly said gas.

**Goal:** Fit all Edit Client fields and Save action in a balanced desktop dialog without internal scrolling at 1440×900.

**Architecture:** Keep existing state, validation, and submit behavior. Change only dialog shell width and edit-mode JSX grouping; preserve one-column mobile fallback.

**Tech Stack:** Next.js, React, Tailwind CSS, Vitest, Playwright.

---

### Task 1: Lock layout contract

- Test: `src/lib/client-edit-balanced-dialog.test.ts`
- Assert `max-w-4xl`, balanced `md:grid-cols-2`, compact field pairs, Notes/Portal/Tags/Address right column.
- Run focused test and confirm RED.

### Task 2: Implement minimal layout

- Modify: `src/components/clients/client-edit-dialog.tsx`
- Modify: `src/components/forms/client-form.tsx`
- Preserve create mode and all input IDs/handlers.
- Run focused tests, lint, TypeScript, and build.

### Task 3: Production verification

- Commit and push only scoped files.
- Run deployment prechecks and clean-image deploy.
- Browser QA at 1440×900 and 390×844.
- Desktop: form body has no vertical overflow; Address and Save visible.
- Mobile: scroll reaches Save, dialog remains inside viewport, zero horizontal overflow.
