"use server";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users, workspaceMembers, workspaces } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";
import { listWorkspacesSchema } from "@/lib/admin-schemas";

const PAGE_SIZE = 10;
export type WorkspaceAdminRow = { id:string; name:string; slug:string; ownerId:string; ownerName:string|null; ownerEmail:string|null; ownerPlan:string|null; ownerPlanExpiresAt:Date|null; ownerBanned:boolean|null; ownerVerified:boolean|null; memberCount:number; clientCount:number; projectCount:number; taskCount:number; invoiceCount:number; latestActivity:Date|null; createdAt:Date };

export async function listWorkspaces(input: z.infer<typeof listWorkspacesSchema> & { plan?: "free"|"solo"|"team"; activity?: "active"|"inactive"|"empty"; ownerStatus?: "healthy"|"banned"|"unverified" }) {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:list-workspaces", admin.id, { limit:120, windowSec:60 });
  const parsed = listWorkspacesSchema.parse(input);
  const plan = input.plan; const activity = input.activity; const ownerStatus = input.ownerStatus;
  const filters = sql`WHERE (${parsed.search} = '' OR w.name ILIKE ${`%${parsed.search}%`} OR w.slug ILIKE ${`%${parsed.search}%`} OR u.name ILIKE ${`%${parsed.search}%`} OR u.email ILIKE ${`%${parsed.search}%`}) AND (${plan ?? ""} = '' OR u.plan = ${plan ?? ""}) AND (${ownerStatus ?? ""} = '' OR (${ownerStatus ?? ""}='healthy' AND u.banned=false AND u.email_verified=true) OR (${ownerStatus ?? ""}='banned' AND u.banned=true) OR (${ownerStatus ?? ""}='unverified' AND u.email_verified=false))`;
  const activityFilter = activity === "active" ? sql`AND x.latest_activity >= now()-interval '30 days'` : activity === "inactive" ? sql`AND (x.latest_activity IS NULL OR x.latest_activity < now()-interval '30 days') AND (x.clients+x.projects+x.tasks+x.invoices)>0` : activity === "empty" ? sql`AND (x.clients+x.projects+x.tasks+x.invoices)=0` : sql``;
  const base = sql`FROM workspaces w LEFT JOIN users u ON u.id=w.owner_id CROSS JOIN LATERAL (SELECT (SELECT count(*)::int FROM workspace_members m WHERE m.workspace_id=w.id) members,(SELECT count(*)::int FROM clients c WHERE c.workspace_id=w.id) clients,(SELECT count(*)::int FROM projects p WHERE p.workspace_id=w.id) projects,(SELECT count(*)::int FROM tasks t WHERE t.workspace_id=w.id) tasks,(SELECT count(*)::int FROM invoices i WHERE i.workspace_id=w.id) invoices,(SELECT max(v) FROM (VALUES ((SELECT max(created_at) FROM projects WHERE workspace_id=w.id)),((SELECT max(created_at) FROM tasks WHERE workspace_id=w.id)),((SELECT max(created_at) FROM invoices WHERE workspace_id=w.id)),((SELECT max(created_at) FROM files WHERE workspace_id=w.id)),((SELECT max(created_at) FROM time_entries WHERE workspace_id=w.id))) z(v)) latest_activity) x ${filters} ${activityFilter}`;
  const countResult = await db.execute(sql`SELECT count(*)::int total ${base}`); const total=Number((countResult.rows[0] as {total:number}).total);
  const result = await db.execute(sql`SELECT w.id,w.name,w.slug,w.owner_id "ownerId",u.name "ownerName",u.email "ownerEmail",u.plan "ownerPlan",u.plan_expires_at "ownerPlanExpiresAt",u.banned "ownerBanned",u.email_verified "ownerVerified",x.members "memberCount",x.clients "clientCount",x.projects "projectCount",x.tasks "taskCount",x.invoices "invoiceCount",x.latest_activity "latestActivity",w.created_at "createdAt" ${base} ORDER BY w.created_at DESC LIMIT ${PAGE_SIZE} OFFSET ${(parsed.page-1)*PAGE_SIZE}`);
  const summaryResult=await db.execute(sql`SELECT count(*)::int total,count(*) filter(where u.plan<>'free' and (u.plan_expires_at is null or u.plan_expires_at>now()))::int paid,count(*) filter(where x.latest_activity>=now()-interval '30 days')::int active,count(*) filter(where (x.clients+x.projects+x.tasks+x.invoices)=0)::int empty,count(*) filter(where u.id is null or u.banned or not u.email_verified)::int risk FROM workspaces w LEFT JOIN users u ON u.id=w.owner_id CROSS JOIN LATERAL (SELECT (SELECT count(*)::int FROM clients c WHERE c.workspace_id=w.id) clients,(SELECT count(*)::int FROM projects p WHERE p.workspace_id=w.id) projects,(SELECT count(*)::int FROM tasks t WHERE t.workspace_id=w.id) tasks,(SELECT count(*)::int FROM invoices i WHERE i.workspace_id=w.id) invoices,(SELECT max(v) FROM (VALUES ((SELECT max(created_at) FROM projects WHERE workspace_id=w.id)),((SELECT max(created_at) FROM tasks WHERE workspace_id=w.id)),((SELECT max(created_at) FROM invoices WHERE workspace_id=w.id))) z(v)) latest_activity) x`);
  return {workspaces:result.rows as unknown as WorkspaceAdminRow[],summary:summaryResult.rows[0] as unknown as {total:number;paid:number;active:number;empty:number;risk:number},total,page:parsed.page,pageSize:PAGE_SIZE,totalPages:Math.max(1,Math.ceil(total/PAGE_SIZE))};
}

export async function getWorkspaceDetail(workspaceId:string){
 const admin=await requireAdmin(); await enforceServerActionRateLimit("admin:workspace-detail",admin.id,{limit:120,windowSec:60});
 const [workspace]=await db.select().from(workspaces).where(eq(workspaces.id,workspaceId)).limit(1); if(!workspace)return null;
 const [owner,members,metrics,payments,recentProjects,recentInvoices]=await Promise.all([
  db.select({id:users.id,name:users.name,email:users.email,emailVerified:users.emailVerified,plan:users.plan,planExpiresAt:users.planExpiresAt,banned:users.banned}).from(users).where(eq(users.id,workspace.ownerId)).limit(1),
  db.select({id:workspaceMembers.id,userId:workspaceMembers.userId,role:workspaceMembers.role,name:users.name,email:users.email,emailVerified:users.emailVerified,banned:users.banned,plan:users.plan,createdAt:workspaceMembers.createdAt}).from(workspaceMembers).leftJoin(users,eq(users.id,workspaceMembers.userId)).where(eq(workspaceMembers.workspaceId,workspaceId)).orderBy(workspaceMembers.role),
  db.execute(sql`SELECT (SELECT count(*) FROM clients WHERE workspace_id=${workspaceId})::int clients,(SELECT count(*) FROM projects WHERE workspace_id=${workspaceId})::int projects,(SELECT count(*) FROM tasks WHERE workspace_id=${workspaceId})::int tasks,(SELECT count(*) FROM invoices WHERE workspace_id=${workspaceId})::int invoices,(SELECT count(*) FROM files WHERE workspace_id=${workspaceId})::int files,(SELECT count(*) FROM time_entries WHERE workspace_id=${workspaceId})::int "timeEntries",(SELECT count(*) FROM proposals WHERE workspace_id=${workspaceId})::int proposals,(SELECT count(*) FROM contracts WHERE workspace_id=${workspaceId})::int contracts,(SELECT max(v) FROM (VALUES((SELECT max(created_at) FROM projects WHERE workspace_id=${workspaceId})),((SELECT max(created_at) FROM tasks WHERE workspace_id=${workspaceId})),((SELECT max(created_at) FROM invoices WHERE workspace_id=${workspaceId})),((SELECT max(created_at) FROM files WHERE workspace_id=${workspaceId})),((SELECT max(created_at) FROM time_entries WHERE workspace_id=${workspaceId})))z(v)) "latestActivity"`),
  db.execute(sql`SELECT order_id "orderId",plan,billing_period "billingPeriod",status,amount,paid_at "paidAt",created_at "createdAt" FROM pakasir_payments WHERE workspace_id=${workspaceId} ORDER BY created_at DESC LIMIT 5`),
  db.execute(sql`SELECT id,name,status,created_at "createdAt" FROM projects WHERE workspace_id=${workspaceId} ORDER BY created_at DESC LIMIT 5`),
  db.execute(sql`SELECT id,invoice_number "number",status,total,created_at "createdAt" FROM invoices WHERE workspace_id=${workspaceId} ORDER BY created_at DESC LIMIT 5`)
 ]);
 return {workspace,owner:owner[0]??null,members,metrics:metrics.rows[0] as Record<string,number|Date|null>,payments:payments.rows,recentProjects:recentProjects.rows,recentInvoices:recentInvoices.rows};
}
