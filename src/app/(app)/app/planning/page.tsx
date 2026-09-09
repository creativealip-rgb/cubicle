import Link from "next/link";
import { WalletCards } from "lucide-react";
import { PersonalExpensesSection } from "@/components/expenses/personal-expenses-section";
import { PersonalReportSection } from "@/components/reports/personal-report-section";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentLang, createT } from "@/lib/i18n";
import { requireWorkspaceOwnerOrRedirect } from "@/lib/require-workspace-owner";

function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function PlanningPage({ searchParams }: {
  searchParams: Promise<{ tab?: string; month?: string; page?: string }>;
}) {
  await requireWorkspaceOwnerOrRedirect();
  const params = await searchParams;
  const lang = await getCurrentLang();
  const t = createT(lang);
  const tab = params.tab === "report" ? "report" : "budget";
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonthKey();
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  return <div className="space-y-4 sm:space-y-6">
    <PageHeader icon={WalletCards} title={t("Planning (50/30/20)", "Planning (50/30/20)")} description={t("Kelola anggaran 50/30/20 dan laporan keuangan pribadi.", "Manage your 50/30/20 budget and personal financial report.")} />
    <div className="inline-flex rounded-xl border bg-muted/70 p-1 shadow-xs">
      <Button asChild size="sm" variant="ghost" className={`h-8 rounded-lg px-3.5 text-xs font-semibold ${tab === "budget" ? "bg-background shadow-sm" : "text-muted-foreground"}`}><Link href={`/app/planning?tab=budget&month=${month}`}>{t("Perencanaan 50/30/20", "50/30/20 Planning")}</Link></Button>
      <Button asChild size="sm" variant="ghost" className={`h-8 rounded-lg px-3.5 text-xs font-semibold ${tab === "report" ? "bg-background shadow-sm" : "text-muted-foreground"}`}><Link href={`/app/planning?tab=report&month=${month}`}>{t("Laporan Pribadi", "Personal Report")}</Link></Button>
    </div>
    {tab === "report" ? <PersonalReportSection month={month} t={t} /> : <PersonalExpensesSection month={month} page={page} t={t} />}
  </div>;
}
