"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportTimeCsv } from "@/lib/actions/time";

export function CsvExportButton({ workspaceId }: { workspaceId: string }) {
  const handleExport = async () => {
    try {
      const csv = await exportTimeCsv({ workspaceId });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `time-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Export failed";
      alert(msg);
    }
  };

  return (
    <Button variant="outline" size="sm" className="gap-1" onClick={handleExport}>
      <Download className="h-3 w-3" /> Export CSV
    </Button>
  );
}
