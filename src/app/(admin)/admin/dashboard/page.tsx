import { getAdminGrowthDashboard } from "@/lib/actions/admin/dashboard";
import { listMarketingSpend } from "@/lib/actions/admin/marketing-spend";
import GrowthKpiDashboard, { type View, views } from "@/components/admin/growth-kpi-dashboard";
import MarketingSpendManager from "@/components/admin/marketing-spend-manager";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string; view?: string }> }) {
  const params = await searchParams;
  const view = views.includes(params.view as View) ? params.view as View : "overview";
  const [data, spend] = await Promise.all([getAdminGrowthDashboard(params.range), view === "acquisition" ? listMarketingSpend() : Promise.resolve([])]);
  return <GrowthKpiDashboard data={data} view={view} spendManager={view === "acquisition" ? <MarketingSpendManager rows={spend} /> : undefined} />;
}
