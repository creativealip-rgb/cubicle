# Cursor / Claude Code Prompt — Cubicle MVP

```text
You are building "Cubicle", a client operation hub SaaS.

Tech stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Neon Postgres
- Drizzle ORM
- Better-Auth
- Cloudflare R2 via S3-compatible SDK
- Server Actions
- Zod validation

Do NOT use Supabase.

Build MVP modules:
1. Auth
2. Workspace
3. Clients
4. Projects
5. Tasks
6. Comments
7. Files
8. Time tracking
9. Invoices
10. Client portal
11. Appointment booking
12. Prompt generator

Use these planning files:
- cubicle_schema.sql
- cubicle_rls.ts
- cubicle_security.md

Requirements:
- Use clean app directory structure.
- Use server actions for mutations.
- Use Drizzle for queries and migrations.
- Use Better-Auth for auth/session/password reset.
- Use Cloudflare R2 private bucket for uploads.
- Add loading/error/empty states.
- Keep UI simple, professional, responsive.
- Client portal must only show shared/visible data.
- Internal notes/files/comments never visible in portal.
- Invoice totals auto-calculate via recalculateInvoice(invoiceId) after every invoice_items mutation.
- Time entries can be imported into invoices and then marked invoiced.
- Prompt generator uses configurable OpenAI-compatible base URL and API key.
- Prompt generator tracks model, input_tokens, output_tokens, cost_usd.
- File downloads must use short-lived signed R2 URLs only.
- Portal/invoice tokens must be hashed in DB, raw token shown once.
- All internal queries must be workspace-scoped and pass access guards from cubicle_rls.ts.

First build:
- database types
- Drizzle schema + migrations
- Neon connection helper
- Better-Auth setup
- auth guard
- app shell
- dashboard
- clients CRUD
- projects CRUD
- tasks CRUD

Suggested app routes:
/
/login
/signup
/forgot-password
/booking/[slug]
/client-portal/[token]
/invoice/[token]
/app/dashboard
/app/clients
/app/clients/[clientId]
/app/projects
/app/projects/[projectId]
/app/tasks
/app/files
/app/time
/app/invoices
/app/invoices/[invoiceId]
/app/calendar
/app/prompts
/app/settings
/app/settings/team
/app/settings/workspace

Do not build phase 2 features yet:
- SMM publishing
- forms builder
- payment gateway
- Google Calendar sync
- e-sign
- automation builder
- advanced role matrix
- white-label portal

Execution order:
1. Inspect repo.
2. If no app exists, create Next.js app.
3. Install dependencies.
4. Add Drizzle + Neon config.
5. Add Better-Auth.
6. Add R2 client helper.
7. Add database schema/migrations from cubicle_schema.sql.
8. Add access-control helpers based on cubicle_rls.ts.
9. Build auth.
10. Build app shell.
11. Build client/project/task CRUD.
12. Add comments/files/time.
13. Add invoices/portal.
14. Add appointment/prompt.
15. Run lint/build.
16. Fix errors.

Critical guardrails:
- Never trust workspaceId/clientId/projectId from form without loading parent row scoped by workspaceId.
- Every internal SELECT/INSERT/UPDATE/DELETE must check workspace membership.
- Viewer role is read-only.
- R2 bucket is private. Never expose bucket listing.
- Appointment double-booking must rely on DB exclusion constraint plus app validation.
- Invoice number must be generated in transaction using workspace_invoice_counters row lock.
- Activity logs and portal access logs must be written for important actions.
```
