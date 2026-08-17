import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminKpis } from "@/lib/actions/admin/dashboard";
import { formatMoneyCompact } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const kpis = await getAdminKpis();

  const tiles = [
    { label: "Total users", value: String(kpis.totalUsers) },
    { label: "New (7d)", value: String(kpis.newUsers7d) },
    { label: "New (30d)", value: String(kpis.newUsers30d) },
    { label: "Workspaces", value: String(kpis.totalWorkspaces) },
    { label: "Completed payments", value: String(kpis.completedPayments) },
    { label: "MRR", value: formatMoneyCompact(kpis.mrr) },
    { label: "Paid users", value: String(kpis.paidUsers) },
    {
      label: "Free→paid conv.",
      value: `${kpis.freeToPaidConversion}%`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#292D34]">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide snapshot. MRR is annualized monthly-equivalent from completed plan payments.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader className="p-4">
              <CardDescription className="text-xs">{t.label}</CardDescription>
              <CardTitle className="text-2xl">{t.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick links</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/users" className="rounded-lg bg-[#6647F0] px-4 py-2 text-sm font-medium text-white hover:bg-[#5333DD]">
            Users
          </Link>
          <Link href="/workspaces" className="rounded-lg border border-[#D9D9D9] bg-white px-4 py-2 text-sm font-medium text-[#292D34] hover:bg-slate-50">
            Workspaces
          </Link>
          <Link href="/payments" className="rounded-lg border border-[#D9D9D9] bg-white px-4 py-2 text-sm font-medium text-[#292D34] hover:bg-slate-50">
            Payments
          </Link>
          <Link href="/audit" className="rounded-lg border border-[#D9D9D9] bg-white px-4 py-2 text-sm font-medium text-[#292D34] hover:bg-slate-50">
            Audit log
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
