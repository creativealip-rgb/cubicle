import Link from "next/link";
import { getAdminGrowthDashboard } from "@/lib/actions/admin/dashboard";
import GrowthKpiDashboard from "@/components/admin/growth-kpi-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const data = await getAdminGrowthDashboard(range);
  return <div className="space-y-6"><GrowthKpiDashboard data={data}/><div className="flex flex-wrap gap-2"><Link href="/users" className="rounded-lg bg-[#6647F0] px-4 py-2 text-sm font-medium text-white">Users</Link><Link href="/workspaces" className="rounded-lg border px-4 py-2 text-sm font-medium">Workspaces</Link><Link href="/payments" className="rounded-lg border px-4 py-2 text-sm font-medium">Payments</Link><Link href="/audit" className="rounded-lg border px-4 py-2 text-sm font-medium">Audit log</Link></div></div>;
}
