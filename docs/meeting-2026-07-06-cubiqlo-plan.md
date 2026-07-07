# Cubiqlo Meeting Plan — 6 Juli 2026

Source: meeting notes `meeting 6 Juli 2026 update.txt` + follow-up clarification.

## Scope

Dokumen ini hanya fokus hasil meeting untuk Cubiqlo, bukan Whaledive.

## Clarification decisions locked

1. Dashboard: hapus card `Invoice belum dibayar` dan `Kesehatan Klien`.
2. Client detail download: format PDF saja.
3. Bulk client download: satu PDF gabungan untuk semua client.
4. Project type: hanya 2 tipe, `by project` dan `by hours`.
5. Time tracking/reporting: tampilkan project type di dashboard dan detailed report.
6. Time tags: default tags dimasukkan; user boleh buat custom tag/rule.
7. Report export: PDF saja.
8. Report export opsi: user pilih checkbox `Dashboard report` dan/atau `Detailed report`.
9. Formulir dipindah cukup ke halaman Kalender.
10. Tagihan di sidebar yang dimaksud adalah billing subscription user Cubiqlo, bukan invoice client.
11. Email di sidebar hapus dulu; Support pindah ke avatar/profile menu.
12. Notes personal butuh recurrence.
13. Journal lanjut sesuai saran: catatan biasa, bukan reminder.
14. Nodes dihapus semua, termasuk route/page.
15. Quick timer v1: klik timer di navbar buka dropdown `pause` / `stop`.
16. Bug select/modal ada di semua modal dengan field opsi.
17. Bahasa output PDF mengikuti bahasa yang dipilih user.
18. Jika public landing page tidak published / slug tidak ada: `404`.
19. Notes personal hanya owner yang bisa akses.

## Progress update — 2026-07-07

| Area | Status | Notes |
| --- | --- | --- |
| P0 Dashboard cleanup/reorder | DONE | Dashboard order now `REMINDER` → `KERJA` → `KEUANGAN`. |
| P0 Dashboard card cleanup | DONE | `Kesehatan Klien` removed. Invoice card restored as `Invoice Jatuh Tempo` per follow-up request. |
| P0 Due-card accuracy | DONE | `Tugas Jatuh Tempo` and `Invoice Jatuh Tempo` now count due items only, not all active/unpaid records. |
| P0 Dashboard activity length | DONE | `Aktivitas Terbaru` limited to latest 5 items with compact rows. |
| P0 Greeting spacing | DONE | Header spacing refined; greeting/date no longer too tight. |
| P0 Greeting realtime | DONE | Greeting moved to client component and updates every 60 seconds using Jakarta time. |
| P0 Select/modal bug | DONE | Global Dialog/Select patch prevents select portal click from closing modal and losing form state. |
| Live deploy | DONE | Latest deployed commit: `2babd61 fix: close forms before refresh`. |

## Priority overview

| Priority | Area | Status | Goal |
| --- | --- | --- | --- |
| P0 | Bug modal select | DONE | Stop data loss saat user pilih opsi default/sama. |
| P0 | Dashboard cleanup/reorder | DONE | Sesuaikan struktur dashboard hasil meeting. |
| P1 | Client PDF export | DONE | Detail client + bulk combined PDF shipped. |
| P1 | Project type + dates | DONE | Added `by project/by hours`, start date, finish date. |
| P1 | Time tags + reports | DONE | Time entry tags + expanded PDF dashboard/detailed report shipped. |
| P1 | Sidebar/menu restructure | DONE | Billing/Profile, Support/Profile, Email hidden, Nodes removed, sidebar simplified. |
| P2 | Personal Notes recurrence | TODO | Notes jadi personal reminder dengan notifikasi. |
| P2 | Landing page v1 interactive | PARTIAL | Builder sudah ada; section manager/interactivity v2 belum. |
| P2 | Timer dropdown | TODO | Pause/stop dari navbar. |

---

# 1. Dashboard restructure

## Requested order

1. `REMINDER`
2. `KERJA`
3. `KEUANGAN`

## Changes

- Keep reminder section at top.
- Group all work-related cards under `KERJA`.
- Move finance-related cards under `KEUANGAN`.
- Delete card:
  - `Invoice belum dibayar`
  - `Kesehatan Klien`

## Acceptance criteria

- Dashboard order matches meeting request.
- Removed cards no longer render.
- No broken data query after card removal.
- Language still follows selected ID/EN preference.

## Suggested files to inspect

```text
src/app/(app)/app/dashboard/page.tsx
src/lib/i18n.ts
```

---

# 2. Clients — detail PDF + bulk download

## Goal

Client page needs button to show/download full client information:

- name
- email
- phone/contact
- address
- company
- notes/metadata if available
- related projects summary if available

## Deliverables

### Single client PDF

Add action/button:

```text
/app/clients/[clientId] → Download client detail PDF
```

API suggestion:

```text
/api/clients/[clientId]/export/pdf
```

### Bulk client PDF

Add action/button on client list:

```text
/app/clients → Download all clients PDF
```

API suggestion:

```text
/api/clients/export/pdf
```

Output:

```text
single combined PDF
```

## Acceptance criteria

- Owner/member can download.
- Viewer rule follows current app permission rules; verify before shipping.
- PDF language follows selected language.
- Bulk export produces one combined PDF, not zip.
- Missing client returns 404.

---

# 3. Projects — project type + start/finish

## Goal

Project has billing/work type:

```text
by project
by hours
```

Also add:

```text
start date
finish date
```

## Data model

Add fields to `projects`:

```text
projectType: "project" | "hours"
startDate: date | null
finishDate: date | null
```

Default:

```text
projectType = "project"
```

## UX

Project create/edit form:

- `Jenis project`: By Project / By Hours
- `Start date`
- `Finish date`

## Client takes two project types?

Recommended rule:

- A client can have multiple projects.
- Each project has exactly one type.
- If one client needs both models, create two projects:
  - `Brand Retainer — by hours`
  - `Website Build — by project`

Reason:

- clean invoice/report logic
- clean client portal display
- avoids mixed billing confusion in one project

## Portal display idea

- By Project: show milestones/status/deliverables.
- By Hours: show tracked hours/tags/billable summary.

## Acceptance criteria

- Existing projects default to `project`.
- Project list/detail shows type badge.
- Client portal can distinguish project type later.

---

# 4. Time tracking — project type + tags

## Goal

Time tracking needs clearer report hierarchy:

```text
PROJECT > TASK > TAG
```

Tags explain what time was spent on.

## Default tags

Add default tags:

```text
Research
Cold Calling
Follow Up - Phone Calling
Follow Up - Text Message
Task Reporting
Meeting
Admin
Creative Work
Development
Revision
Quality Check
Client Communication
```

User can add custom tags/rules.

## Data model suggestion

```text
time_tags
- id
- workspaceId
- name
- color
- createdBy
- createdAt

time_entry_tags
- timeEntryId
- tagId
```

If v1 speed preferred, use one `tag` text field first, then normalize later. But meeting says custom rule needed, so better DB table.

## Forms

Time entry create/edit:

- project
- task
- tags multi-select
- billable toggle
- start/finish
- duration

## Acceptance criteria

- Default tags auto-available per workspace.
- User can create custom tag.
- Tags appear in time report.
- Project type appears in report.

---

# 5. Time report — Dashboard + Detailed PDF

## Report types

User can export:

- Dashboard report only
- Detailed report only
- Both in one PDF

UI checkbox:

```text
[ ] Dashboard report
[ ] Detailed report
```

If both checked:

```text
single combined PDF
```

## Dashboard report content

Heading:

- Timeframe
- Total Hours
- Billable Hours

Charts:

- Pie Chart Project (Hours)
- Pie Chart Task/Tags (Hours)

Tables:

```text
Project/Task | Total Hours | Billable Hours
```

## Detailed report content

Heading:

- Client Name
- Timeframe
- Total Billable Amount (hrs only)
- Total Billable Amount
- Total Hours

Table columns:

```text
Hari
User
Project
Project Type
Task
Tags
Billable Amount
Start
Finish
Total Hours
```

## Export format

```text
PDF only
```

## Acceptance criteria

- User can choose date range/client/project.
- Checkbox controls which sections appear.
- If no data, PDF renders empty-state, not crash.
- Language follows selected language.

---

# 6. Calendar + Forms

## Goal

Move Formulir from Sales/Penjualan to Calendar.

## Changes

- Remove Formulir from Penjualan sidebar.
- Add button on Calendar page:

```text
Buat formulir
```

## UX

On `/app/calendar`:

- primary action `Buat formulir`
- opens form builder/create form flow
- form can be tied to calendar/booking needs

## Acceptance criteria

- Formulir menu no longer under Penjualan.
- Calendar has create form entry point.
- Existing questionnaire/form routes do not break.

---

# 7. Sidebar/menu restructure

## Changes

### Keuangan

Remove billing subscription menu from sidebar:

```text
/app/billing
```

Move to avatar/profile dropdown.

Important:

- This is Cubiqlo subscription billing, not client invoices.
- Client invoices stay in finance area.

### Komunikasi

- Remove Email from sidebar for now.
- Move Support to avatar/profile dropdown.

### Personal

- Rename `Personal` to `Notes`.
- `Notes` becomes personal reminder feature.
- `Journal` remains simple notes/journal.
- Remove `Nodes` from sidebar.
- Delete `Nodes` route/page.

## Acceptance criteria

- Sidebar simpler.
- Avatar menu contains:
  - Billing/subscription
  - Support
- `/app/nodes` returns 404 after deletion.
- Email route can stay hidden for future, unless explicitly deleted later.

Suggested files:

```text
src/components/app-sidebar.tsx
src/components/app-topbar.tsx
src/app/(app)/app/nodes/page.tsx
```

---

# 8. Notes personal reminder

## Rename

```text
Personal → Notes
```

## Access

```text
Owner only
```

## Purpose

Personal reminder for owner, examples:

- annual client gift
- birthday reminder
- contract anniversary
- yearly check-in
- follow-up reminder

## Requirements

- create note/reminder
- due date
- recurrence
- notification schedule:

```text
7 days before
3 days before
1 day before
```

Notification channels:

- email
- dashboard reminder section

## Recurrence examples

```text
none
daily
weekly
monthly
yearly
custom rule
```

Custom rule needed.

## Data model suggestion

Either extend `personal_notes` or create dedicated `personal_reminders`.

Recommended:

```text
personal_reminders
- id
- workspaceId
- ownerId
- title
- body
- dueDate
- recurrenceRule
- notify7d
- notify3d
- notify1d
- status
- createdAt
- updatedAt
```

Reason:

- cleaner than overloading notes
- recurrence easier
- owner-only semantics clearer

## Acceptance criteria

- Only owner can access Notes.
- Reminder appears in dashboard reminder section.
- Email notification scheduled at 7/3/1 days before.
- Custom recurrence accepted.

---

# 9. Journal

## Decision

Journal should be normal notes/journal, not reminders.

## Suggested scope v1

- title
- content
- date
- optional mood/tag later
- search later

## Difference vs Notes

| Feature | Notes | Journal |
| --- | --- | --- |
| Purpose | personal reminder | normal diary/work notes |
| Due date | yes | no |
| Recurrence | yes | no |
| Notification | yes | no |
| Owner only | yes | maybe user-scoped |

## Acceptance criteria

- Journal copy explains it is normal notes.
- No duplicate reminder logic in Journal.

---

# 10. Landing page builder interactive v1

## Current

- `/app/personal-site` builder exists.
- `/site/[slug]` public page exists.
- `/site/alip` verified 200.

## Request

Make it more interactive, not static.

## Recommended v1 scope

Do not build full Canva/Google Sites yet. Build a better interactive v1:

1. Add section cards UI instead of raw `Heading|Content` textarea.
2. Allow section types:

```text
Hero
About
Services
Portfolio
Testimonials
FAQ
Contact
Links
```

3. Add section actions:

```text
add
delete
duplicate
move up/down
```

4. Add live preview refresh after save.
5. Add mobile/desktop preview toggle.
6. Add template presets:

```text
Freelancer
Agency
Consultant
Portfolio
```

7. Public route behavior:

```text
not published / slug missing -> 404
```

## Acceptance criteria

- User can add sections without typing delimiter format.
- Public page renders selected sections.
- Missing/unpublished slug returns 404.

---

# 11. Navbar quick timer

## Goal

Current topbar timer clickable.

## v1 behavior

Click timer → dropdown:

```text
Pause
Stop
```

## Acceptance criteria

- If timer active, dropdown shows pause/stop.
- Pause pauses active timer.
- Stop ends active timer.
- If no timer, show inactive state or shortcut to time page.

Suggested files:

```text
src/components/app-topbar.tsx
src/app/api/time/active/route.ts
```

---

# 12. Critical bug — modal select closes form/data loss

## Bug

In modals/forms with select fields:

- User enters data.
- Select default is e.g. `Aktif`.
- User opens select and chooses `Aktif` again.
- Modal/form closes automatically.
- Data input is lost.

Affected:

```text
all modals/forms with option fields
```

Example:

```text
Add Project modal → Status default Aktif → pick Aktif again → modal closes and typed data disappears
```

## Priority

```text
P0
```

## Likely cause

Potential causes to inspect:

1. Select item click bubbling to dialog close handler.
2. Form submit triggered by select item/button missing `type="button"`.
3. Dialog state tied to select value change.
4. Radix Select inside Dialog conflict with outside click/focus handler.
5. Command/select option rendered as submit button.

## Fix direction

- Ensure non-submit buttons use:

```tsx
<button type="button">
```

- Prevent dialog close on select value reselect.
- Avoid resetting form state on select open/value unchanged.
- Audit all modal components using Select.

## Acceptance criteria

- Re-selecting same/default option never closes modal.
- Typed form data remains.
- Fix confirmed on Add Project and at least 3 other modal forms.

---

# 13. Suggested sprint order

## Sprint 1 — P0 safety + dashboard/menu cleanup

1. Fix modal select data-loss bug.
2. Dashboard reorder + delete cards.
3. Sidebar restructure:
   - hide Email
   - move Support to avatar
   - move Billing to avatar
   - rename Personal → Notes
   - remove Nodes route/page
   - move Formulir entry to Calendar
4. Timer dropdown pause/stop v1.

## Sprint 2 — Project/time foundation

1. Add project type and project dates.
2. Add time tags model/defaults/custom tags.
3. Show project type/tags in time entry/report base queries.

## Sprint 3 — PDF exports

1. Client detail PDF.
2. Bulk client combined PDF.
3. Time dashboard/detailed PDF export with checkboxes.

## Sprint 4 — Notes recurrence + notifications

1. Owner-only Notes.
2. Recurrence/custom rule.
3. 7/3/1-day reminder emails.
4. Dashboard reminder integration.

## Sprint 5 — Landing page interactive v1

1. Section card UI.
2. Section types.
3. Add/delete/duplicate/move.
4. Mobile/desktop preview.
5. Template presets.
6. 404 behavior for unpublished/missing slug.

---

# 14. Open implementation notes

## Project with both types under one client

Use separate projects per type. Do not mix billing mode inside one project.

## Email/sidebar

Email route can stay in code but hidden from sidebar for now, because user said next may add again.

## Support

Support route can stay but entry moves to avatar/profile menu.

## Nodes

Delete route/page and remove sidebar entry. If user hits `/app/nodes`, result should be 404.

## PDF language

Use selected app language:

```text
ID -> Indonesian PDF labels
EN -> English PDF labels
```

## Public landing page unpublished/missing slug

Return:

```text
404
```
