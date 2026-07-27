# Client Portal ID/EN Language Switch Design

Date: 2026-07-25
Status: Approved design

## Goal

Make the public Client Portal fully usable in Indonesian and English through an `ID | EN` switch matching the authenticated dashboard language control.

## Scope

Target route:

```text
/client-portal/[token]
```

Covered surfaces:

- Portal header and summary metrics
- Ringkasan/Overview
- Requests and request history
- Projects, tasks, timeline, time summaries, and packages
- Files, folders, upload/download controls, breadcrumbs, and empty states
- Invoices and payment history
- Contact guidance and channel actions
- Status labels, buttons, dialogs, placeholders, validation feedback, loading states, and toast messages

Database-provided content is not translated. Project names, request descriptions, filenames, invoice numbers, client names, workspace names, and user-entered text stay unchanged.

## Selected approach

Reuse Cubiqlo's existing dashboard language infrastructure:

- Cookie: `cubiqlo_lang`
- Values: `id` and `en`
- Persistence: one year
- Server helper: `getCurrentLang()` and `createT()` from `src/lib/i18n.ts`
- Client provider: `LangProvider` and `useT()` from `src/lib/i18n-client.tsx`
- URL remains unchanged; no `/en/` prefix and no language query parameter

This keeps the dashboard and Client Portal consistent. A visitor's last selected language applies across both surfaces in the same browser.

## Architecture

### Server boundary

`src/app/client-portal/[token]/page.tsx` reads `cubiqlo_lang` using `getCurrentLang()`.

Server-rendered portal copy uses:

```ts
const lang = await getCurrentLang();
const t = createT(lang);
```

The portal subtree is wrapped with:

```tsx
<LangProvider lang={lang}>...</LangProvider>
```

First paint therefore matches the cookie without a client hydration flash.

### Client boundary

Interactive portal components consume `useT()`:

```ts
const { t, lang, locale } = useT();
```

The language switch calls the existing provider's `setLang(next)` method. This:

1. Updates client translation state immediately.
2. Writes `cubiqlo_lang` for one year.
3. Refreshes server components in a React transition.
4. Disables repeated switching while refresh is pending.

### Language switch

Add a portal-specific visual wrapper that reuses the existing language state rather than creating another cookie or translation system.

Placement:

- Desktop: portal header action area
- Mobile: portal header action row, visible without opening a menu

Control:

```text
ID | EN
```

Requirements:

- Active language has clear selected state.
- Each target is at least 44 px high on mobile.
- `aria-label` identifies Indonesian and English choices.
- Pending state disables both options to prevent rapid-click refresh races.
- Existing portal branding and primary actions retain visual priority.

## Translation rules

### Translate

- Navigation and tab labels
- Headings and helper copy
- Empty states
- Buttons and action labels
- Status mappings
- Form labels, placeholders, validation, and feedback
- Date/time labels
- Upload limits and destination guidance
- Contact instructions
- Package/order UI
- Invoice and payment-history UI

### Keep unchanged

- Brand and company names
- Client names
- Project names
- Filenames and folder names
- Invoice numbers
- User-entered titles/descriptions/comments
- Currency codes
- Standard file extension and format names such as PDF

### Locale formatting

- Indonesian: `id-ID`
- English: `en-US`

Dates and relative time labels must follow the active locale. Stored timestamps and database values do not change.

## Translation implementation

Use inline translation calls next to visible strings:

```tsx
t("File belum tersedia", "No files available yet")
```

Reasons:

- Matches existing Cubiqlo SaaS i18n pattern.
- Keeps component-specific copy close to its usage.
- Avoids introducing a second dictionary framework for one route.
- Supports incremental typechecked conversion across portal components.

Shared status/format helpers accept `lang` or use translation-neutral keys, preventing duplicate mappings across components.

## Data flow

```text
Request
  → read cubiqlo_lang cookie on server
  → render server copy in selected language
  → pass lang into LangProvider
  → client components render via useT()
  → visitor clicks ID/EN
  → optimistic client switch
  → cookie update
  → router.refresh()
  → server copy resynchronizes
```

No database migration, API schema change, or portal-token behavior change is required.

## Error handling

- Missing or invalid cookie defaults to Indonesian.
- Language switching never blocks portal access.
- If server refresh is delayed, optimistic client translations remain usable.
- Existing upload/request/action errors receive both ID and EN variants.
- User-generated backend error details are not exposed or machine-translated.

## Testing

### Unit tests

Add tests covering:

- Valid `id` and `en` language normalization
- Invalid/missing language fallback to `id`
- Shared portal status labels in both languages
- Date locale selection
- Translation helpers for project progress and request categories

Use TDD: each behavior must fail before production implementation.

### Static verification

- `npx tsc --noEmit`
- `npx vitest run`
- `npm run build`
- Scan portal components for remaining hardcoded Indonesian UI strings
- Scan for accidental translation of database content

### Browser QA

Test live portal in both languages:

- Desktop viewport
- Mobile 390 × 844
- Every tab: Overview, Projects, Files, Invoices, Contact
- Switch ID → EN and EN → ID
- Reload preserves language
- Open portal in a new tab preserves language
- No hydration mismatch or console errors
- No page-level horizontal overflow
- Switch targets and primary actions remain at least 44 px
- Date/status labels change locale while database content stays unchanged

## Deployment

Follow Cubiqlo/VPS deployment guardrails:

1. Run pre-deploy checks.
2. Run tests, typecheck, and production build.
3. Rebuild only the Cubiqlo application image.
4. Keep `dokploy-traefik` as the sole public owner of ports 80/443.
5. Verify health, portal HTTP response, browser behavior, logs, and proxy ownership after deploy.

## Documentation updates

After implementation:

- Add release entry to `CHANGELOG.md`.
- Update `docs/feature-status.md`.
- Update `docs/client-portal-audit-2026-07-25.md` with bilingual completion evidence.
- Update shared workspace log/index if deployed.

## Non-goals

- Locale-prefixed routes such as `/en/client-portal/...`
- Automatic translation of database content
- User/workspace language fields in database
- Additional languages beyond Indonesian and English
- Translating generated invoice PDF content unless separately requested
- Replacing Cubiqlo's existing i18n infrastructure

## Acceptance criteria

1. Client Portal shows an accessible `ID | EN` switch matching dashboard behavior.
2. All portal-owned visible UI copy is available in Indonesian and English.
3. Language choice persists through `cubiqlo_lang` and survives reload.
4. Client and workspace data remain unchanged in both languages.
5. Date/status formatting follows `id-ID` or `en-US`.
6. Switching is immediate for client UI and synchronized for server UI without race conditions.
7. Both language states pass desktop/mobile browser QA, typecheck, tests, production build, and live health verification.
8. No changes weaken portal token, tenant isolation, analytics correctness, or public proxy safety.
