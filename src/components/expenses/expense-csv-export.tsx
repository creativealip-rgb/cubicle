"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportExpensesCsv } from "@/lib/actions/expenses";
import { toast } from "sonner";
import { useT } from "@/lib/i18n-client";

interface ExpenseCsvExportButtonProps {
  month?: string;
  categoryId?: string;
  q?: string;
}

export function ExpenseCsvExportButton({ month, categoryId, q }: ExpenseCsvExportButtonProps) {
  const { t } = useT();
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const csv = await exportExpensesCsv({ month, categoryId, q });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses-${month || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("CSV diunduh", "CSV downloaded"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Export gagal", "Export failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleExport} disabled={loading}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {t("Ekspor CSV", "Export CSV")}
    </Button>
  );
}
