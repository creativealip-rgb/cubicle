"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ReportType = "detailed" | "dashboard" | "full";

const OPTIONS: { value: ReportType; label: string; desc: string }[] = [
  {
    value: "detailed",
    label: "Detailed Report",
    desc: "Rincian per entry: hari, tugas, tags, duties, jam, & amount per klien.",
  },
  {
    value: "dashboard",
    label: "Dashboard Report",
    desc: "Ringkasan visual: donut chart per project & task + subtotal jam.",
  },
  {
    value: "full",
    label: "Full Report (keduanya)",
    desc: "Detailed + Dashboard dalam satu dokumen.",
  },
];

export function PdfExportButton() {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<ReportType>("full");

  const handleExport = () => {
    window.open(
      `/api/time/export/pdf/va-timesheet?report=${report}`,
      "_blank",
      "noopener,noreferrer",
    );
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Download className="h-3 w-3" /> Export PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export PDF Timesheet</DialogTitle>
          <DialogDescription>
            Pilih jenis laporan yang ingin diekspor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {OPTIONS.map((opt) => {
            const active = report === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setReport(opt.value)}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    active ? "border-primary" : "border-muted-foreground/40"
                  }`}
                >
                  {active && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.desc}</span>
                </span>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button size="sm" className="gap-1" onClick={handleExport}>
            <Download className="h-3 w-3" /> Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
