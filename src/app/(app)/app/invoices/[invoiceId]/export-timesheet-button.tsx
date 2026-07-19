"use client";

import { useState } from "react";
import { Clock, Download } from "lucide-react";
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

// yyyy-mm-dd in local time
function toISODate(d: Date): string {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().split("T")[0]!;
}

function monthRange(offset: number): { from: string; to: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { from: toISODate(first), to: toISODate(last) };
}

export function ExportTimesheetButton({
  clientId,
  projectId,
  label = "Ekspor Timesheet",
}: {
  clientId: string;
  projectId?: string | null;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const applyPreset = (preset: "this" | "last" | "clear") => {
    if (preset === "clear") {
      setFrom("");
      setTo("");
      return;
    }
    const r = monthRange(preset === "this" ? 0 : -1);
    setFrom(r.from);
    setTo(r.to);
  };

  const rangeInvalid = Boolean(from && to && from > to);

  const handleExport = () => {
    const params = new URLSearchParams({
      report: "full",
      clientId,
    });
    if (projectId) params.set("projectId", projectId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.open(
      `/api/time/export/pdf/va-timesheet?${params.toString()}`,
      "_blank",
      "noopener,noreferrer",
    );
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Clock className="h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ekspor Timesheet</DialogTitle>
          <DialogDescription>
            Pilih rentang tanggal. Kosong = semua waktu untuk klien/proyek invoice ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <label className="text-xs font-medium text-muted-foreground">Periode</label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("this")}>
              Bulan ini
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("last")}>
              Bulan lalu
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => applyPreset("clear")}>
              Semua waktu
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          {rangeInvalid && (
            <p className="text-xs text-destructive">Tanggal awal harus sebelum tanggal akhir.</p>
          )}
          {!from && !to && (
            <p className="text-xs text-muted-foreground">Kosong = semua waktu.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button size="sm" className="gap-1" onClick={handleExport} disabled={rangeInvalid}>
            <Download className="h-3 w-3" /> Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
