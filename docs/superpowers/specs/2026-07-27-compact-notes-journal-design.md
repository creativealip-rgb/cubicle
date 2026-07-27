# Compact Notes and Journal Design

## Goal
Reduce vertical space and interaction friction while preserving separate Notes and Journal menus.

## Notes
- Todoist-style list: one compact row per note.
- Circular status control at left; title and due metadata in center; expand affordance at right.
- Clicking row opens inline detail/edit controls.
- Header combines status filter, search, and primary `+ Catatan` action.
- Remove search submit button, duplicate “Buka form” label, outer list card header, and automatic infinite scrolling.
- Keep 10-item batches with explicit load-more.

## Journal
- Separate `/app/journal` menu and route.
- Compact date-led timeline rows, not task checkboxes.
- Each row shows mood, title, one-line content preview, date, and small tags.
- Clicking row expands full content and actions inline.
- Header combines Active/Archived filter, search, export, and primary `+ Entri` action.
- Keep existing 10-item pagination.

## Responsive Behavior
- Desktop controls stay in one compact toolbar.
- Mobile controls wrap; primary action remains visible.
- Row metadata moves below title; destructive actions appear only when expanded.
- Minimum interactive target stays approximately 40–44px.

## Data and Safety
No schema or server-action changes. Existing create, update, status, archive, restore, delete, conversion, reminder, recurrence, tags, mood, and export behavior remain.

## Verification
- Wiring tests assert compact markers and separate route behavior.
- TypeScript compile and production build must pass.
- Browser-check authenticated Notes and Journal at desktop/mobile widths.
- Deploy through existing Cubiqlo Docker image without changing proxy configuration.
