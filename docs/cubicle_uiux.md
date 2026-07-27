# Cubicle / Kubikel — UI/UX Direction

## 1. Design Positioning

Cubicle should feel like:

```text
ClickUp power, Notion calm, Stripe billing clarity.
```

Use ClickUp as reference for:
- left sidebar + workspace navigation
- task list/board patterns
- task detail drawer
- dashboard widgets
- quick actions
- timer access from task/global area

Do not copy ClickUp complexity:
- no custom fields in MVP
- no dashboard builder in MVP
- no automation builder in MVP
- no advanced view system in MVP
- no deep hierarchy in MVP
- no dense icon-heavy UI

Cubicle is client-centric, not task-centric.

Primary object hierarchy:

```text
Client → Project → Task / Files / Time / Invoice
```

## 2. Visual Style

Tone:
- clean SaaS
- agency-friendly
- calm productivity
- professional enough for invoices/client portal

Palette:

```text
Background: #F8FAFC
Surface: #FFFFFF
Text: #0F172A
Muted text: #64748B
Border: #E2E8F0
Primary: #2563EB
Primary hover: #1D4ED8
Success: #16A34A
Warning: #F59E0B
Danger: #DC2626
Purple accent: #7C3AED
```

Status colors:

```text
Todo: gray
In progress: blue
Review: amber
Done: green
Urgent: red
```

Typography:

```text
Font: Geist / Inter
H1: 28-32px semibold
H2: 20-24px semibold
H3: 16-18px semibold
Body: 14-16px regular
Meta: 12-13px muted
```

Shape:

```text
Card radius: 12-16px
Button radius: 8-10px
Input radius: 8-10px
Border: 1px #E2E8F0
Shadow: subtle only
```

## 3. App Shell

Desktop layout:

```text
┌────────────────────────────────────────────────────────┐
│ Topbar: Search | + New | Timer | Workspace | User      │
├───────────────┬────────────────────────────────────────┤
│ Sidebar 260px │ Page content                           │
│ Dashboard     │ Header + tabs + filters + content      │
│ Clients       │                                        │
│ Projects      │                                        │
│ Tasks         │                                        │
│ Files         │                                        │
│ Time          │                                        │
│ Invoices      │                                        │
│ Calendar      │                                        │
│ Prompts       │                                        │
│ Settings      │                                        │
└───────────────┴────────────────────────────────────────┘
```

Mobile layout:
- sidebar becomes drawer
- topbar keeps menu, search icon, timer, user
- tables become stacked cards
- task drawer becomes fullscreen sheet

Global topbar actions:

```text
Search
+ New dropdown
Active timer shortcut
Workspace switcher
User menu
```

Notification/reminder split:
- Topbar notification bell is an event inbox for fresh client/team updates: approvals, file views, invoice payments, portal requests, signed/viewed docs, assignments.
- Dashboard `Perlu ditangani` is the active action queue for stateful work that remains until resolved: overdue invoices, due tasks, pending approvals, waiting contracts, upcoming appointments, personal reminders.
- Recurring computed urgency such as `invoice_overdue` and `task_due_soon` must not appear in bell unread counts. It belongs on the dashboard action queue only.
- Use product copy, not implementation copy: `Update terbaru dari client dan tim` for bell; `Prioritas aktif yang belum selesai` for dashboard.

`+ New` dropdown:

```text
Client
Project
Task
Time Entry
Invoice
Appointment
Prompt
```

## 4. Navigation

Sidebar items:

```text
Dashboard
Clients
Projects
Tasks
Files
Time
Invoices
Calendar
Prompts
Settings
```

Settings subitems:

```text
Workspace
Team
Billing defaults
AI usage
Storage
```

Use breadcrumbs on detail pages:

```text
Clients / Acme Studio / Website Redesign
```

## 5. Dashboard UX

Goal: answer “what needs attention today?”

Layout:

```text
Header:
Good morning, {user}
[New] [Start timer]

Action queue:
Perlu ditangani grouped as Urgent | Menunggu aksi | Terjadwal

Work cards:
Active Clients | Active Projects

Main grid:
Left 2/3:
- My tasks due today
- Recent activity

Right 1/3:
- Revenue / cash collection
- Client breakdown
- Recent activity
```

Dashboard widgets are fixed in MVP. No builder.

## 6. Clients UX

Clients list:

```text
Header: Clients [Add client]
Filters: Search | Status | Tag

Table columns:
Client | Contact | Active Projects | Unpaid | Portal | Status | Actions
```

Mobile client card:

```text
Client name
Company/email
Projects count
Unpaid amount
Portal status
Actions
```

Client detail header:

```text
Client name
Company / email / phone
Status badge
[Portal toggle] [Copy portal link] [New project] [New invoice]
```

Client tabs:

```text
Overview | Projects | Files | Invoices | Appointments | Notes
```

Overview content:
- contact info
- active projects
- unpaid invoices
- recent activity
- portal status

## 7. Projects UX

Project detail should be main work cockpit.

Header:

```text
Project name
Client
Status
Progress %
Due date
[Share to portal]
```

Tabs:

```text
Overview | Board | List | Files | Time | Comments
```

MVP default: Board.

Board columns:

```text
Todo | In Progress | Review | Done
```

Card content:

```text
Task title
Assignee avatar/name
Due date
Priority
Client-visible badge if true
Comment count / file count optional
```

List view can be basic:

```text
Task | Status | Assignee | Due date | Priority | Visible
```

## 8. Task Drawer UX

Use ClickUp-inspired right drawer.

Open from:
- task board card
- task list row
- global task page

Drawer fields:

```text
Title
Status
Priority
Assignee
Due date
Client visible toggle
Description
Comments
Files linked
Time entries
Activity
```

Interaction rules:
- editing stays inside drawer
- status update quick select
- comments at bottom
- internal/client visibility explicit
- client-visible badge always obvious

Mobile: fullscreen sheet.

## 9. Time Tracking UX

ClickUp inspiration: timer available in task and global areas.

Cubicle improvement: time can attach to client/project even when task optional.

Timer card:

```text
[Client required]
[Project required]
[Task optional]
[Description]
[Billable toggle]
[Start]
```

Running timer:

```text
Client / Project / Task
Live duration
[Stop]
```

Manual entry modal:

```text
Client
Project
Task optional
Description
Manual minutes
Billable
Hourly rate
Date
```

Timesheet table:

```text
Date | Client | Project | Task | User | Duration | Billable | Status | Actions
```

Filters:

```text
Date range | Client | Project | User | Billable | Status
```

## 10. Invoice UX

ClickUp weak here; Cubicle should be stronger.

Invoice list:

```text
Invoice # | Client | Issue date | Due date | Total | Status | Shared | Actions
```

Invoice builder layout:

```text
Left 2/3:
- Client
- Issue date / due date
- Line items
- Import billable time
- Notes / terms

Right 1/3:
- Status
- Subtotal / discount / tax / total
- Generate PDF
- Share link
- Mark paid
```

Line item table:

```text
Description | Qty | Rate | Amount | Actions
```

Import billable time flow:
1. click `Import time`
2. modal shows billable uninvoiced entries for client
3. user selects entries
4. system creates invoice items
5. imported time entries become `invoiced`
6. duplicate import blocked by DB + UI warning

## 11. Files UX

Files list:

```text
Name | Client | Project | Size | Visibility | Uploaded by | Date | Actions
```

Upload flow:
- drag/drop area
- choose client/project
- choose visibility: internal/client
- show max size 25 MB
- show allowed file types
- upload progress
- signed download only

Visibility badge:

```text
Internal
Client-visible
```

## 12. Calendar / Appointment UX

Calendar MVP:
- month/week list simple
- show appointments
- show task due dates optional

Booking page public:

```text
Workspace/client branding
Select date
Select available slot
Name/email
Notes
Confirm booking
```

States:
- slot unavailable
- double booking rejected
- booking confirmed

## 13. Prompt Generator UX

Prompt page layout:

```text
Left:
Template select
Goal
Audience
Tone
Platform
Key points
CTA
Language
Client/project context optional

Right:
Generated prompt
Generated output
[Copy]
[Save to project]
```

Template categories:

```text
Social caption
Copywriting
Email
Design brief
Video script
Presentation
```

Show AI usage note:

```text
Model, tokens, estimated cost
```

## 14. Client Portal UX

Portal should not look like internal app. No heavy sidebar.

Client portal layout:

```text
Header:
Workspace logo/name
Client name

Cards:
Shared projects
Visible tasks
Shared files
Invoices
Book meeting
```

Project portal view:

```text
Project progress
Visible tasks
Client comments
Shared files
```

Client actions:
- comment with name/email
- download shared file
- upload file if enabled
- view invoice
- book appointment

Portal states:

```text
Invalid token
Expired token
Revoked token
Nothing shared yet
No visible tasks
No files shared
```

Portal must never show:
- internal notes
- internal comments
- internal files
- non-visible projects/tasks
- team/member internals beyond needed display name

## 15. Empty States

Use helpful empty states with action.

Examples:

Clients:
```text
No clients yet
Add your first client to start organizing projects, files, time, and invoices.
[Add client]
```

Projects:
```text
No projects yet
Create a project under a client to track tasks and billable work.
[New project]
```

Tasks:
```text
No tasks here
Add tasks to plan work and share progress with your client.
[Add task]
```

Invoices:
```text
No invoices yet
Create an invoice manually or import billable time.
[Create invoice]
```

Time:
```text
No time tracked
Start a timer or add a manual entry.
[Start timer] [Manual entry]
```

## 16. Error / Permission States

Permission denied:

```text
You do not have access to this workspace or item.
```

Viewer write attempt:

```text
Viewer role is read-only.
Ask workspace owner for edit access.
```

Portal invalid:

```text
This portal link is invalid or has expired.
Ask the workspace owner for a new link.
```

File download failed:

```text
Could not generate secure download link.
Try again.
```

Invoice duplicate time import:

```text
Some time entries were already invoiced and were skipped.
```

## 17. MVP UI Component Set

Use shadcn/ui-style components:

```text
Button
Input
Textarea
Select
Checkbox
Switch
Badge
Card
Table
Tabs
Dialog
Sheet
Dropdown menu
Popover
Toast
Skeleton
Avatar
Separator
```

Custom components:

```text
AppShell
Sidebar
Topbar
PageHeader
KpiCard
StatusBadge
VisibilityBadge
TaskCard
TaskDrawer
TimerCard
InvoiceSummaryCard
EmptyState
```

## 18. Implementation Guardrails

- keep pages calm and readable
- prefer drawers for detail/edit without losing context
- always show current workspace context
- always show client/project context on task/time/invoice rows
- make visibility to client explicit
- destructive actions require confirmation
- tables need pagination after 50 rows
- mobile tables become cards
- no phase 2 UI in MVP
