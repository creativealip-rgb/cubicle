"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";
import { getRangeWindow, parseGrowthRange, type GrowthRange } from "@/lib/admin-growth-metrics";

export type GrowthDashboard = {
  range: GrowthRange; generatedAt: string;
  signups: number; activated: number; paidAccounts: number; mrr: number; arr: number; arpu: number | null;
  completedPayments: number; activeWorkspaces: number; activeUsers: number; projects: number; tasks: number; timeTrackingWorkspaces: number; portalWorkspaces: number;
  previous: { signups: number; activated: number; paidAccounts: number; mrr: number };
  unavailable: { visitors: string; referrals: string; cac: string };
};

export async function getAdminGrowthDashboard(input?: string): Promise<GrowthDashboard> {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:growth-kpis", admin.id, { limit: 120, windowSec: 60 });
  const range = parseGrowthRange(input);
  const { days } = getRangeWindow(range);
  const result = await db.execute(sql`
    WITH bounds AS (
      SELECT now() AS finish, now() - make_interval(days => ${days}) AS start, now() - make_interval(days => ${days * 2}) AS previous_start
    ), activated AS (
      SELECT w.id, w.created_at,
        EXISTS (SELECT 1 FROM clients c WHERE c.workspace_id = w.id) AS has_client,
        EXISTS (SELECT 1 FROM projects p WHERE p.workspace_id = w.id) AS has_project,
        (EXISTS (SELECT 1 FROM tasks t WHERE t.workspace_id = w.id) OR EXISTS (SELECT 1 FROM invoices i WHERE i.workspace_id = w.id) OR EXISTS (SELECT 1 FROM time_entries te WHERE te.workspace_id = w.id) OR EXISTS (SELECT 1 FROM portal_visits pv WHERE pv.workspace_id = w.id)) AS has_activity
      FROM workspaces w
    ), current_metrics AS (
      SELECT
        (SELECT count(*) FROM users u, bounds b WHERE u.created_at >= b.start AND u.created_at < b.finish)::int AS signups,
        (SELECT count(*) FROM activated a, bounds b WHERE a.has_client AND a.has_project AND a.has_activity AND a.created_at >= b.start AND a.created_at < b.finish)::int AS activated,
        (SELECT count(DISTINCT p.workspace_id) FROM pakasir_payments p, bounds b WHERE p.status = 'completed' AND p.payment_type = 'plan' AND COALESCE(p.paid_at, p.created_at) < b.finish)::int AS paid_accounts,
        (SELECT COALESCE(sum(CASE WHEN p.billing_period = 'monthly' THEN p.amount::numeric WHEN p.billing_period = 'yearly' THEN p.amount::numeric / 12 ELSE 0 END), 0) FROM pakasir_payments p, bounds b WHERE p.status = 'completed' AND p.payment_type = 'plan' AND COALESCE(p.paid_at, p.created_at) < b.finish) AS mrr,
        (SELECT count(*) FROM pakasir_payments p WHERE p.status = 'completed' AND p.payment_type = 'plan')::int AS completed_payments,
        (SELECT count(DISTINCT w.id) FROM workspaces w JOIN (SELECT DISTINCT workspace_id FROM clients WHERE created_at >= (SELECT start FROM bounds) UNION SELECT DISTINCT workspace_id FROM projects WHERE created_at >= (SELECT start FROM bounds) UNION SELECT DISTINCT workspace_id FROM tasks WHERE created_at >= (SELECT start FROM bounds) UNION SELECT DISTINCT workspace_id FROM invoices WHERE created_at >= (SELECT start FROM bounds) UNION SELECT DISTINCT workspace_id FROM time_entries WHERE created_at >= (SELECT start FROM bounds) UNION SELECT DISTINCT workspace_id FROM portal_visits WHERE visited_at >= (SELECT start FROM bounds)) active ON active.workspace_id = w.id)::int AS active_workspaces,
        (SELECT count(DISTINCT wm.user_id) FROM workspace_members wm JOIN workspaces w ON w.id = wm.workspace_id)::int AS active_users,
        (SELECT count(*) FROM projects p, bounds b WHERE p.created_at >= b.start AND p.created_at < b.finish)::int AS projects,
        (SELECT count(*) FROM tasks t, bounds b WHERE t.created_at >= b.start AND t.created_at < b.finish)::int AS tasks,
        (SELECT count(DISTINCT te.workspace_id) FROM time_entries te, bounds b WHERE te.created_at >= b.start AND te.created_at < b.finish)::int AS time_tracking_workspaces,
        (SELECT count(DISTINCT pv.workspace_id) FROM portal_visits pv, bounds b WHERE pv.visited_at >= b.start AND pv.visited_at < b.finish)::int AS portal_workspaces
    ), previous_metrics AS (
      SELECT
        (SELECT count(*) FROM users u, bounds b WHERE u.created_at >= b.previous_start AND u.created_at < b.start)::int AS signups,
        (SELECT count(*) FROM activated a, bounds b WHERE a.has_client AND a.has_project AND a.has_activity AND a.created_at >= b.previous_start AND a.created_at < b.start)::int AS activated,
        (SELECT count(DISTINCT p.workspace_id) FROM pakasir_payments p, bounds b WHERE p.status = 'completed' AND p.payment_type = 'plan' AND COALESCE(p.paid_at, p.created_at) >= b.previous_start AND COALESCE(p.paid_at, p.created_at) < b.start)::int AS paid_accounts,
        (SELECT COALESCE(sum(CASE WHEN p.billing_period = 'monthly' THEN p.amount::numeric WHEN p.billing_period = 'yearly' THEN p.amount::numeric / 12 ELSE 0 END), 0) FROM pakasir_payments p, bounds b WHERE p.status = 'completed' AND p.payment_type = 'plan' AND COALESCE(p.paid_at, p.created_at) >= b.previous_start AND COALESCE(p.paid_at, p.created_at) < b.start) AS mrr
    ) SELECT current_metrics.*, previous_metrics.signups AS previous_signups, previous_metrics.activated AS previous_activated, previous_metrics.paid_accounts AS previous_paid_accounts, previous_metrics.mrr AS previous_mrr, now()::text AS generated_at FROM current_metrics, previous_metrics`);
  const r = result.rows[0] as Record<string, string | number>;
  const mrr = Number(r.mrr ?? 0), paidAccounts = Number(r.paid_accounts ?? 0);
  return { range, generatedAt: String(r.generated_at), signups: Number(r.signups ?? 0), activated: Number(r.activated ?? 0), paidAccounts, mrr, arr: mrr * 12, arpu: paidAccounts ? mrr / paidAccounts : null, completedPayments: Number(r.completed_payments ?? 0), activeWorkspaces: Number(r.active_workspaces ?? 0), activeUsers: Number(r.active_users ?? 0), projects: Number(r.projects ?? 0), tasks: Number(r.tasks ?? 0), timeTrackingWorkspaces: Number(r.time_tracking_workspaces ?? 0), portalWorkspaces: Number(r.portal_workspaces ?? 0), previous: { signups: Number(r.previous_signups ?? 0), activated: Number(r.previous_activated ?? 0), paidAccounts: Number(r.previous_paid_accounts ?? 0), mrr: Number(r.previous_mrr ?? 0) }, unavailable: { visitors: "Phase 2 event instrumentation required", referrals: "Phase 2 event instrumentation required", cac: "Marketing spend is not recorded" } };
}

/** @deprecated Use getAdminGrowthDashboard. */
export async function getAdminKpis() { const d = await getAdminGrowthDashboard("30d"); return { totalUsers: d.activeUsers, newUsers7d: d.signups, newUsers30d: d.signups, totalWorkspaces: d.activeWorkspaces, completedPayments: d.completedPayments, mrr: String(d.mrr), freeToPaidConversion: d.signups ? Math.round((d.paidAccounts / d.signups) * 1000) / 10 : 0, paidUsers: d.paidAccounts }; }

export { parseGrowthRange };
