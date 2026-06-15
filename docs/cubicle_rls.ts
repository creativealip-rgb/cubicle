// Cubicle / Kubikel app-layer access control
// Target: Next.js App Router + Drizzle ORM + Neon + Better-Auth
// Purpose: replace Supabase RLS with explicit tenant guards in every query/action.

import { and, eq, exists, sql } from 'drizzle-orm'
// Import actual schema symbols from your Drizzle schema file.
// import { workspaceMembers, clients, projects, tasks, files, invoices } from '@/db/schema'

type Role = 'owner' | 'member' | 'viewer'

type SessionUser = {
  id: string
  email?: string | null
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export function requireUser(user: SessionUser | null | undefined): SessionUser {
  if (!user?.id) throw new UnauthorizedError()
  return user
}

// Use inside every server action / route handler before reading or mutating workspace data.
export async function assertWorkspaceMember(db: any, userId: string, workspaceId: string, allowedRoles: Role[] = ['owner', 'member', 'viewer']) {
  const member = await db.query.workspaceMembers.findFirst({
    where: (m: any, { and, eq, inArray }: any) => and(
      eq(m.workspaceId, workspaceId),
      eq(m.userId, userId),
      inArray(m.role, allowedRoles),
    ),
  })

  if (!member) throw new ForbiddenError('Workspace access denied')
  return member
}

export async function assertWorkspaceWritable(db: any, userId: string, workspaceId: string) {
  return assertWorkspaceMember(db, userId, workspaceId, ['owner', 'member'])
}

export async function assertWorkspaceOwner(db: any, userId: string, workspaceId: string) {
  return assertWorkspaceMember(db, userId, workspaceId, ['owner'])
}

// Pattern for tenant-safe list queries:
// 1. get workspaceId from route/current workspace cookie
// 2. assert membership first
// 3. always include eq(table.workspaceId, workspaceId) in where clause
export async function listClientsForWorkspace(db: any, user: SessionUser, workspaceId: string) {
  requireUser(user)
  await assertWorkspaceMember(db, user.id, workspaceId)

  return db.query.clients.findMany({
    where: (c: any, { eq }: any) => eq(c.workspaceId, workspaceId),
    orderBy: (c: any, { desc }: any) => [desc(c.createdAt)],
  })
}

// Pattern for tenant-safe mutations:
// - never trust workspaceId/clientId/projectId from form alone
// - first load parent row scoped by workspaceId
// - then mutate
export async function assertClientInWorkspace(db: any, user: SessionUser, workspaceId: string, clientId: string) {
  requireUser(user)
  await assertWorkspaceMember(db, user.id, workspaceId)

  const client = await db.query.clients.findFirst({
    where: (c: any, { and, eq }: any) => and(eq(c.id, clientId), eq(c.workspaceId, workspaceId)),
  })

  if (!client) throw new ForbiddenError('Client access denied')
  return client
}

export async function assertProjectInWorkspace(db: any, user: SessionUser, workspaceId: string, projectId: string) {
  requireUser(user)
  await assertWorkspaceMember(db, user.id, workspaceId)

  const project = await db.query.projects.findFirst({
    where: (p: any, { and, eq }: any) => and(eq(p.id, projectId), eq(p.workspaceId, workspaceId)),
  })

  if (!project) throw new ForbiddenError('Project access denied')
  return project
}

export async function assertTaskInWorkspace(db: any, user: SessionUser, workspaceId: string, taskId: string) {
  requireUser(user)
  await assertWorkspaceMember(db, user.id, workspaceId)

  const task = await db.query.tasks.findFirst({
    where: (t: any, { and, eq }: any) => and(eq(t.id, taskId), eq(t.workspaceId, workspaceId)),
  })

  if (!task) throw new ForbiddenError('Task access denied')
  return task
}

// Portal token policy:
// - raw token comes from URL only
// - hash token with SHA-256 in server route
// - query by hash
// - portal_enabled true, not revoked, not expired
// - log every access
export async function getClientPortalAccess(db: any, tokenHash: string, requestMeta: { ip?: string; userAgent?: string }) {
  const client = await db.query.clients.findFirst({
    where: (c: any, { and, eq, isNull, or, gt }: any) => and(
      eq(c.portalTokenHash, tokenHash),
      eq(c.portalEnabled, true),
      isNull(c.portalTokenRevokedAt),
      or(isNull(c.portalTokenExpiresAt), gt(c.portalTokenExpiresAt, new Date())),
    ),
  })

  if (!client) throw new ForbiddenError('Portal token invalid')

  await db.insert(db._.schema.portalAccessLogs).values({
    workspaceId: client.workspaceId,
    clientId: client.id,
    tokenType: 'client_portal',
    tokenHashPrefix: tokenHash.slice(0, 12),
    ipAddress: requestMeta.ip,
    userAgent: requestMeta.userAgent,
  })

  return client
}

export async function getInvoiceShareAccess(db: any, tokenHash: string, requestMeta: { ip?: string; userAgent?: string }) {
  const invoice = await db.query.invoices.findFirst({
    where: (i: any, { and, eq, isNull, or, gt }: any) => and(
      eq(i.sharedTokenHash, tokenHash),
      isNull(i.sharedTokenRevokedAt),
      or(isNull(i.sharedTokenExpiresAt), gt(i.sharedTokenExpiresAt, new Date())),
    ),
  })

  if (!invoice) throw new ForbiddenError('Invoice token invalid')

  await db.insert(db._.schema.portalAccessLogs).values({
    workspaceId: invoice.workspaceId,
    clientId: invoice.clientId,
    invoiceId: invoice.id,
    tokenType: 'invoice_share',
    tokenHashPrefix: tokenHash.slice(0, 12),
    ipAddress: requestMeta.ip,
    userAgent: requestMeta.userAgent,
  })

  return invoice
}

// Portal visible data rules:
// - projects: same client + clientVisible true
// - tasks: project client match + task.clientVisible true + project.clientVisible true
// - files: same client/project + visibility='client'
// - comments: visibility='client'
// - invoices: shown only via invoice token, or via client portal if product explicitly allows invoice list for that client

// R2 file authorization rule:
// - never expose raw bucket list
// - file download route: validate user membership OR portal access, then create short-lived signed URL
// - object key convention: workspaces/{workspaceId}/files/{fileId}/{safeFilename}

// Required route/action checklist:
// [ ] requireUser() for internal app route
// [ ] assertWorkspaceMember() before SELECT
// [ ] assertWorkspaceWritable() before INSERT/UPDATE/DELETE
// [ ] include workspaceId in every WHERE
// [ ] validate parent-child relationship (client/project/task belong to same workspace)
// [ ] portal routes use token hash, visible flags, and access logs
// [ ] uploads enforce max size, allowed mime, and R2 key prefix
