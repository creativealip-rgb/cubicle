# Client Portal Heading Design

## Goal

Make the client portal heading precise and compact by prioritizing the client identity, hiding workspace address/contact details, and reducing the visual size of the ID/EN control.

## Selected Direction

Option B: client-focused heading.

## Content hierarchy

1. Keep workspace logo as the portal owner branding.
2. Use `client.companyName || client.name` as the primary heading.
3. Show `Dikelola oleh [workspace name]` in Indonesian or `Managed by [workspace name]` in English as secondary text.
4. Resolve workspace name from `workspaceContact.billingName || workspaceContact.name`.
5. Do not render workspace billing address, email, or phone in the portal heading.

## Layout

- Desktop: logo and identity remain left; language and secure-access controls remain right.
- Mobile: preserve current wrapping behavior without overflow.
- Reduce primary heading from `text-2xl sm:text-3xl` to a tighter `text-xl sm:text-2xl` hierarchy.
- Keep logo dimensions unchanged unless visual verification shows imbalance.

## Language control

- Preserve ID and EN as a segmented control.
- Reduce each button from `min-h-11 min-w-11 px-3` to a compact control around 28px high with narrower horizontal padding.
- Preserve `aria-label`, `aria-pressed`, disabled state, and visible active state.
- Keep touch usability through spacing and explicit buttons; this compact control is a preference switch, not a primary action.

## Secure access badge

Keep existing secure-access badge, aligned with the compact language control. Minor height/padding alignment is allowed; wording and visibility rules stay unchanged.

## Scope

Modify only:

- `src/app/client-portal/[token]/page.tsx`
- `src/components/portal/portal-language-switch.tsx`
- focused tests if needed

Do not change portal metrics, tabs, request cards, workspace settings data, invoice identity, or internal workspace screens.

## Verification

- TypeScript and ESLint pass for touched files.
- Portal heading renders client name first and workspace attribution second.
- Workspace address, email, and phone do not render in heading.
- ID/EN remains functional and visually compact.
- Verify desktop and mobile layout on live dev portal.
