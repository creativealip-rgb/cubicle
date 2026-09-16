"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";
import { getRangeWindow, parseGrowthRange, type GrowthRange } from "@/lib/admin-growth-metrics";

export type GrowthDashboard = {
  range: GrowthRange; generatedAt: string;
  signups: number; activated: number; paidAccounts: number; mrr: number; arr: number; arpu: number | null;
  completedPayments: number; activeWorkspaces: number; activeUsers: number; wau: number; mau: number; projects: number; tasks: number; projectsPerActiveUser: number | null; tasksPerProject: number | null; timeTrackingWorkspaces: number; portalWorkspaces: number;
  firstClientCount: number; firstProjectCount: number; firstTaskCount: number; firstInvoiceCount: number; firstPortalCount: number;
  subscriptionStarted: number; subscriptionUpgraded: number; subscriptionRenewed: number; subscriptionExpired: number; subscriptionReactivated: number; freeToPaidRate: number | null; upgradeRate: number | null; monthlyChurnRate: number | null; subscriptionTrackingSince: string | null;
  previous: { signups: number; activated: number; paidAccounts: number; mrr: number };
  unavailable: { visitors: string; referrals: string; cac: string }; visitors: number; signupStarts: number; signupCompletions: number; organic: number; referrals: number; spend: number; cps: number | null; cac: number | null; analytics_events?: string; marketing_spend?: string;
};

export async function getAdminGrowthDashboard(input?: string): Promise<GrowthDashboard> {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:growth-kpis", admin.id, { limit: 120, windowSec: 60 });
  const range = parseGrowthRange(input);
  const { days } = getRangeWindow(range);
  const interval = range === "12m" ? sql`make_interval(months => 12)` : sql`make_interval(days => ${days})`;
  const result = await db.execute(sql`
    WITH bounds AS (
      SELECT now() AS finish, now() - ${interval} AS start, now() - (${interval}) * 2 AS previous_start
    ), activation_milestones AS (
      SELECT
        w.id,
        (SELECT min(created_at) FROM clients WHERE workspace_id = w.id) AS first_client_at,
        (SELECT min(created_at) FROM projects WHERE workspace_id = w.id) AS first_project_at,
        (SELECT min(ts) FROM (
          SELECT created_at AS ts FROM tasks WHERE workspace_id = w.id
          UNION ALL SELECT created_at FROM invoices WHERE workspace_id = w.id
          UNION ALL SELECT created_at FROM time_entries WHERE workspace_id = w.id
          UNION ALL SELECT visited_at FROM portal_visits WHERE workspace_id = w.id
        ) activity) AS first_activity_at
      FROM workspaces w
    ), activation_dates AS (
      SELECT id, GREATEST(first_client_at, first_project_at, first_activity_at) AS activated_at
      FROM activation_milestones
      WHERE first_client_at IS NOT NULL AND first_project_at IS NOT NULL AND first_activity_at IS NOT NULL
    ), latest_plan AS (
      SELECT DISTINCT ON (workspace_id) workspace_id, amount, billing_period FROM pakasir_payments WHERE status = 'completed' AND payment_type = 'plan' ORDER BY workspace_id, COALESCE(paid_at, created_at) DESC
    ), paid_now AS (
      SELECT DISTINCT wm.workspace_id, u.plan, u.plan_expires_at, lp.amount, lp.billing_period FROM workspace_members wm JOIN users u ON u.id = wm.user_id LEFT JOIN latest_plan lp ON lp.workspace_id = wm.workspace_id WHERE wm.role = 'owner' AND u.plan <> 'free' AND (u.plan_expires_at IS NULL OR u.plan_expires_at > now())
    ), current_metrics AS (
      SELECT
        (SELECT count(*) FROM users u, bounds b WHERE u.created_at >= b.start AND u.created_at < b.finish)::int AS signups,
        (SELECT count(DISTINCT anonymous_id) FROM analytics_events, bounds WHERE event_name = 'landing_viewed' AND occurred_at >= start AND occurred_at < finish)::int AS visitors,
        (SELECT count(*) FROM analytics_events, bounds WHERE event_name = 'signup_started' AND occurred_at >= start AND occurred_at < finish)::int AS signup_starts,
        (SELECT count(*) FROM analytics_events, bounds WHERE event_name = 'signup_completed' AND occurred_at >= start AND occurred_at < finish)::int AS signup_completions,
        (SELECT count(DISTINCT anonymous_id) FROM analytics_events, bounds WHERE event_name = 'landing_viewed' AND medium = 'organic' AND occurred_at >= start AND occurred_at < finish)::int AS organic,
        (SELECT count(DISTINCT anonymous_id) FROM analytics_events, bounds WHERE event_name = 'landing_viewed' AND referral_id IS NOT NULL AND occurred_at >= start AND occurred_at < finish)::int AS referrals,
        (SELECT COALESCE(sum(amount), 0) FROM marketing_spend, bounds WHERE spend_date >= start::date AND spend_date < finish::date AND currency = 'IDR')::numeric AS spend,
        (SELECT count(*) FROM activation_dates a, bounds b WHERE a.activated_at >= b.start AND a.activated_at < b.finish)::int AS activated,
        (SELECT count(*) FROM paid_now)::int AS paid_accounts,
        (SELECT COALESCE(sum(CASE WHEN billing_period = 'monthly' THEN amount::numeric WHEN billing_period = 'yearly' THEN amount::numeric / 12 ELSE NULL END), NULL) FROM paid_now) AS mrr,
        (SELECT count(*) FROM pakasir_payments p WHERE p.status = 'completed' AND p.payment_type = 'plan')::int AS completed_payments,
        (SELECT count(DISTINCT workspace_id) FROM (SELECT workspace_id FROM clients WHERE created_at >= (SELECT start FROM bounds) UNION SELECT workspace_id FROM projects WHERE created_at >= (SELECT start FROM bounds) UNION SELECT workspace_id FROM tasks WHERE created_at >= (SELECT start FROM bounds) UNION SELECT workspace_id FROM invoices WHERE created_at >= (SELECT start FROM bounds) UNION SELECT workspace_id FROM time_entries WHERE created_at >= (SELECT start FROM bounds) UNION SELECT workspace_id FROM portal_visits WHERE visited_at >= (SELECT start FROM bounds)) active)::int AS active_workspaces,
        (SELECT count(DISTINCT user_id) FROM (SELECT created_by AS user_id FROM tasks, bounds WHERE created_at >= start AND created_at < finish AND created_by IS NOT NULL UNION SELECT user_id FROM time_entries, bounds WHERE created_at >= start AND created_at < finish UNION SELECT created_by FROM projects, bounds WHERE created_at >= start AND created_at < finish AND created_by IS NOT NULL) actors)::int AS active_users,
        (SELECT count(DISTINCT user_id) FROM (SELECT created_by AS user_id FROM tasks, bounds WHERE created_at >= finish - interval '7 days' AND created_at < finish AND created_by IS NOT NULL UNION SELECT user_id FROM time_entries, bounds WHERE created_at >= finish - interval '7 days' AND created_at < finish UNION SELECT created_by FROM projects, bounds WHERE created_at >= finish - interval '7 days' AND created_at < finish AND created_by IS NOT NULL) actors)::int AS wau,
        (SELECT count(DISTINCT user_id) FROM (SELECT created_by AS user_id FROM tasks, bounds WHERE created_at >= finish - interval '30 days' AND created_at < finish AND created_by IS NOT NULL UNION SELECT user_id FROM time_entries, bounds WHERE created_at >= finish - interval '30 days' AND created_at < finish UNION SELECT created_by FROM projects, bounds WHERE created_at >= finish - interval '30 days' AND created_at < finish AND created_by IS NOT NULL) actors)::int AS mau,
        (SELECT count(*) FROM projects p, bounds b WHERE p.created_at >= b.start AND p.created_at < b.finish)::int AS projects,
        (SELECT count(*) FROM tasks t, bounds b WHERE t.created_at >= b.start AND t.created_at < b.finish)::int AS tasks,
        (SELECT count(*) FROM clients c, bounds b WHERE c.created_at >= b.start AND c.created_at < b.finish)::int AS first_client_count,
        (SELECT count(*) FROM projects p, bounds b WHERE p.created_at >= b.start AND p.created_at < b.finish)::int AS first_project_count,
        (SELECT count(*) FROM tasks t, bounds b WHERE t.created_at >= b.start AND t.created_at < b.finish)::int AS first_task_count,
        (SELECT count(*) FROM invoices i, bounds b WHERE i.created_at >= b.start AND i.created_at < b.finish)::int AS first_invoice_count,
        (SELECT count(*) FROM portal_visits v, bounds b WHERE v.visited_at >= b.start AND v.visited_at < b.finish)::int AS first_portal_count,
        (SELECT count(*) FROM subscription_events s, bounds b WHERE s.event_type = 'started' AND s.occurred_at >= b.start AND s.occurred_at < b.finish)::int AS subscription_started,
        (SELECT count(*) FROM subscription_events s, bounds b WHERE s.event_type = 'upgraded' AND s.occurred_at >= b.start AND s.occurred_at < b.finish)::int AS subscription_upgraded,
        (SELECT count(*) FROM subscription_events s, bounds b WHERE s.event_type = 'renewed' AND s.occurred_at >= b.start AND s.occurred_at < b.finish)::int AS subscription_renewed,
        (SELECT count(*) FROM subscription_events s, bounds b WHERE s.event_type = 'expired' AND s.occurred_at >= b.start AND s.occurred_at < b.finish)::int AS subscription_expired,
        (SELECT count(*) FROM subscription_events s, bounds b WHERE s.event_type = 'reactivated' AND s.occurred_at >= b.start AND s.occurred_at < b.finish)::int AS subscription_reactivated,
        (SELECT min(occurred_at)::text FROM subscription_events) AS subscription_tracking_since,
        (SELECT count(DISTINCT te.workspace_id) FROM time_entries te, bounds b WHERE te.created_at >= b.start AND te.created_at < b.finish)::int AS time_tracking_workspaces,
        (SELECT count(DISTINCT pv.workspace_id) FROM portal_visits pv, bounds b WHERE pv.visited_at >= b.start AND pv.visited_at < b.finish)::int AS portal_workspaces
    ), previous_metrics AS (
      SELECT (SELECT count(*) FROM users u, bounds b WHERE u.created_at >= b.previous_start AND u.created_at < b.start)::int AS signups, (SELECT count(*) FROM activation_dates a, bounds b WHERE a.activated_at >= b.previous_start AND a.activated_at < b.start)::int AS activated, NULL::int AS paid_accounts, NULL::numeric AS mrr
    ) SELECT current_metrics.*, previous_metrics.signups AS previous_signups, previous_metrics.activated AS previous_activated, previous_metrics.paid_accounts AS previous_paid_accounts, previous_metrics.mrr AS previous_mrr, now()::text AS generated_at FROM current_metrics, previous_metrics`);
  const r = result.rows[0] as Record<string, string | number>;
  const mrr = Number(r.mrr ?? 0), paidAccounts = Number(r.paid_accounts ?? 0);
  const n = (key: string) => Number(r[key] ?? 0);
  const started = n("subscription_started"), reactivated = n("subscription_reactivated"), upgraded = n("subscription_upgraded"), expired = n("subscription_expired");
  return { range, generatedAt: String(r.generated_at), signups: n("signups"), activated: n("activated"), paidAccounts, mrr, arr: mrr * 12, arpu: paidAccounts ? mrr / paidAccounts : null, completedPayments: n("completed_payments"), activeWorkspaces: n("active_workspaces"), activeUsers: n("active_users"), wau: n("wau"), mau: n("mau"), projects: n("projects"), tasks: n("tasks"), projectsPerActiveUser: n("active_users") ? n("projects") / n("active_users") : null, tasksPerProject: n("projects") ? n("tasks") / n("projects") : null, timeTrackingWorkspaces: n("time_tracking_workspaces"), portalWorkspaces: n("portal_workspaces"), firstClientCount: n("first_client_count"), firstProjectCount: n("first_project_count"), firstTaskCount: n("first_task_count"), firstInvoiceCount: n("first_invoice_count"), firstPortalCount: n("first_portal_count"), subscriptionStarted: started, subscriptionUpgraded: upgraded, subscriptionRenewed: n("subscription_renewed"), subscriptionExpired: expired, subscriptionReactivated: reactivated, freeToPaidRate: n("signup_completions") ? (started + reactivated) / n("signup_completions") * 100 : null, upgradeRate: started + reactivated + upgraded ? upgraded / (started + reactivated + upgraded) * 100 : null, monthlyChurnRate: ["30d", "90d", "12m"].includes(range) && paidAccounts ? expired / paidAccounts * 100 : null, subscriptionTrackingSince: r.subscription_tracking_since ? String(r.subscription_tracking_since) : null, previous: { signups: n("previous_signups"), activated: n("previous_activated"), paidAccounts: n("previous_paid_accounts"), mrr: n("previous_mrr") }, unavailable: { visitors: "No landing events in selected range", referrals: "No referral events in selected range", cac: "No spend or signup completions in selected range" }, visitors: n("visitors"), signupStarts: n("signup_starts"), signupCompletions: n("signup_completions"), organic: n("organic"), referrals: n("referrals"), spend: n("spend"), cps: n("signup_starts") ? n("spend") / n("signup_starts") : null, cac: n("signup_completions") ? n("spend") / n("signup_completions") : null, analytics_events: "analytics_events", marketing_spend: "marketing_spend" };
}

/** @deprecated Use getAdminGrowthDashboard. */
export async function getAdminKpis() { const d = await getAdminGrowthDashboard("30d"); return { totalUsers: d.activeUsers, newUsers7d: d.signups, newUsers30d: d.signups, totalWorkspaces: d.activeWorkspaces, completedPayments: d.completedPayments, mrr: String(d.mrr), freeToPaidConversion: d.signups ? Math.round((d.paidAccounts / d.signups) * 1000) / 10 : 0, paidUsers: d.paidAccounts }; }

export { parseGrowthRange };
