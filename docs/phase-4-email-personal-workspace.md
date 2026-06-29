# Cubiqlo Phase 4 — Email Suite + Personal Workspace

Last updated: 2026-06-29

## Goal

Scope P4 dipotong jadi MVP kecil agar Cubiqlo tidak bengkak:

- Email suite ringan untuk kirim/draft email client dari workspace.
- Personal workspace ringan untuk catatan pribadi user.

Bukan target P4 MVP:

- Gmail/IMAP sync.
- Shared inbox kompleks.
- Email automation sequence.
- Personal knowledge base besar.
- WhatsApp provider.

## Shipped

### Email suite v0

- [x] Route `/app/email`
- [x] Compose email manual
- [x] Save draft
- [x] Send now via existing Resend helper / console fallback
- [x] Optional link to client/project
- [x] Sent/draft/failed log in `email_messages`
- [x] Activity logs:
  - `created_email_draft`
  - `sent_email_message`
  - `failed_email_message`
  - `deleted_email_message`
- [x] Sidebar item under `Komunikasi`

### Personal workspace v0

- [x] Route `/app/personal`
- [x] User-scoped private notes per workspace
- [x] Create note
- [x] Pin/unpin note
- [x] Mark done/open
- [x] Archive note
- [x] Delete note
- [x] Sidebar item under `Personal`

## DB changes

Migration:

```text
drizzle/0013_p4_email_personal_workspace.sql
```

Tables:

```text
email_messages
personal_notes
```

## Verification

- [x] Migration applied to production Docker DB `cubicle-pg`
- [x] `npm run lint` pass
- [x] `npm run build` pass

## Remaining P4 options

Phase 4B shipped:

- [x] Email templates/snippets with create/update/delete
- [x] Personal note edit
- [x] Personal note search

Email suite next:

- [ ] Use template to prefill compose fields client-side
- [ ] Re-send draft
- [ ] Convert email to task/follow-up
- [ ] Email event timeline per client
- [ ] Real inbox delivery QA with Resend

Personal workspace next:

- [ ] Convert note to task/project idea
- [ ] Daily planner view
- [ ] Markdown preview

## Decision

P4 v0 is intentionally small. Keep future P4 work incremental and tied to client/project workflow, not standalone CRM/email-suite bloat.
