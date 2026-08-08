# UI Standardization — Loading, Toast, Confirm Dialog

**Date:** 2026-08-03
**Scope:** All client components in `src/`

## New Components

### `components/ui/loading-button.tsx`
Standardized loading button replacing manual `{loading ? "..." : "..."}` pattern.
- Props: `loading?: boolean`, `loadingText?: string`
- Shows `Loader2` spinner + disables button when loading
- Sets `aria-busy` for accessibility
- Extends all `Button` props (variant, size, className, etc.)

### `components/ui/confirm-dialog.tsx`
Standardized confirmation dialog replacing `window.confirm()`.
- Props: `open`, `onOpenChange`, `title`, `description`, `onConfirm` (async), `destructive`
- Keyboard accessible (Escape to close)
- Loading state on confirm button

### `lib/hooks/use-confirm.tsx`
Hook for imperative confirm dialogs (drop-in `window.confirm()` replacement).
```tsx
const { confirm, dialog } = useConfirm();
// ...
const ok = await confirm({ title, description, destructive });
```

## Migration Summary

### Toast (alert → toast.error)
| File | Calls Fixed |
|---|---|
| `app-topbar.tsx` | 1 |
| `questionnaire-builder.tsx` | 3 |
| `send-questionnaire-button.tsx` | 2 |
| **Total** | **6** |

### Confirm Dialog (window.confirm → ConfirmDialog)
| File | Calls Fixed |
|---|---|
| `site/section-editor.tsx` | 2 |
| `site/builder-client.tsx` | 4 |
| `settings/google-calendar-connect.tsx` | 1 |
| `settings/workspace-branding-form.tsx` | 1 |
| `settings/currency-rates-form.tsx` | 1 |
| **Total** | **9** |

### Loading Button (manual pattern → LoadingButton)
**29 files** migrated to `<LoadingButton>`. Key files:
- All invoice action buttons (delete, send, remind, add-item, payment, share-token)
- All form submit buttons (client, task, expense, proposal, invoice-meta)
- All delete buttons (expense, contract, proposal, permanent-delete)
- Auth forms (signup, login)
- Settings forms (workspace-name, branding, booking-slug, team-manager)
- Dialog action buttons (status-edit, portal-request, comment-list)

**3 files** skipped (complex icon-swap patterns, non-critical):
- `google-auth-button.tsx` — icon + text swap
- `prompt-studio.tsx` — icon + text swap
- `portal-request-admin.tsx` — nested ternary meeting dialog

## Files Modified
37 modified, 3 new files.
