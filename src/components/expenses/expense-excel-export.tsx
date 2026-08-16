"use client";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";
type Props = { month?: string; categoryId?: string; q?: string };
export function ExpenseExcelExportButton({ month, categoryId, q }: Props) {
  const { t } = useT();
  function handleExport() {
    const p = new URLSearchParams();
    if (month) p.set("month", month);
    if (categoryId) p.set("categoryId", categoryId);
    if (q) p.set("q", q);
    window.location.href = `/api/expenses/export/xlsx?${p.toString()}`;
  }
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1"
      onClick={handleExport}
    >
      <Download className="h-4 w-4" />
      {t("Ekspor Excel", "Export Excel")}
    </Button>
  );
}
