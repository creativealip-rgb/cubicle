import { getAdminGrowthDashboard } from "@/lib/actions/admin/dashboard";
import GrowthKpiDashboard from "@/components/admin/growth-kpi-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const data = await getAdminGrowthDashboard(range);
  return <GrowthKpiDashboard data={data} />;
}
