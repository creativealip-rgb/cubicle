# Edit Client Balanced Dialog Design

## Goal

Make every Edit Client field and Save action visible without internal scrolling on normal desktop viewports, while preserving safe scrolling on mobile and short-height screens.

## Desktop layout

- Dialog width: `max-w-4xl` with existing viewport gutters.
- Header remains compact and descriptive.
- Form body uses two balanced columns at `md` and above.
- Left column:
  - Identity heading.
  - Custom Client ID + Name in one row.
  - Company + Website in one row.
  - Contact heading.
  - Email + Phone in one row.
- Right column:
  - Internal Notes, fixed three-row textarea.
  - Client Portal slug + Generate action.
  - Tags.
  - Address, fixed two-row textarea.
- Footer remains visible beneath content. It must not overlap Address.
- Field controls keep 36px height and existing labels, validation, accessibility names, values, and mutation behavior.

## Responsive behavior

- Below `md`, fields stack into one column.
- Dialog keeps `max-height: 90dvh` and body scrolling as fallback for mobile and unusually short desktop viewports.
- No horizontal overflow at 390px.

## Scope

- Change only `ClientEditDialog` shell sizing and edit-mode `ClientForm` layout.
- Do not change create-client layout, server actions, schema, validation, portal behavior, or stored data.
- Do not add tabs, accordions, dependencies, or new abstractions.

## Verification

- Regression test asserts desktop shell width and balanced field placement.
- ESLint and TypeScript pass.
- Production browser QA opens Edit Client at desktop and mobile.
- Desktop proof: all labels, Address, and Save Changes visible; body `scrollHeight <= clientHeight` at a 1440×900 viewport.
- Mobile proof: dialog remains inside viewport, can scroll to Save Changes, and has zero horizontal overflow.
