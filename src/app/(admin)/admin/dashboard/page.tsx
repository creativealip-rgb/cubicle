import { getAdminGrowthDashboard } from "@/lib/actions/admin/dashboard";
import { listMarketingSpend } from "@/lib/actions/admin/marketing-spend";
import GrowthKpiDashboard from "@/components/admin/growth-kpi-dashboard";
import MarketingSpendManager from "@/components/admin/marketing-spend-manager";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const [data, spend] = await Promise.all([getAdminGrowthDashboard(range), listMarketingSpend()]);
  return <><GrowthKpiDashboard data={data} /><div className="mt-5"><MarketingSpendManager rows={spend} /></div></>;
}
