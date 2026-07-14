"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { importTimeEntries } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { timeEntryStatusVariant } from "@/lib/status-badge";
import { useT } from "@/lib/i18n-client";

interface TimeEntry {
  id: string;
  description: string | null;
  durationMinutes: number | null;
  hourlyRate: string | null;
  startTime: Date | null;
  status: string;
}

export function ImportTimeSection({
  invoiceId,
  timeEntries,
  currency = "IDR",
}: {
  invoiceId: string;
  timeEntries: TimeEntry[];
  currency?: string;
}) {
  const router = useRouter();
  const { t, lang } = useT();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === timeEntries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(timeEntries.map((t) => t.id)));
    }
  }

  async function handleImport() {
    if (selected.size === 0) {
      toast.error(t("Pilih minimal satu catatan waktu", "Select at least one time entry"));
      return;
    }
    setLoading(true);
    try {
      await importTimeEntries({
        invoiceId,
        timeEntryIds: Array.from(selected),
      });
      toast.success(t(`Berhasil import ${selected.size} catatan waktu`, `Imported ${selected.size} time entries`));
      setSelected(new Set());
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal", "Failed"));
    } finally {
      setLoading(false);
    }
  }

  if (timeEntries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {t("Tidak ada catatan waktu yang belum ditagihkan untuk klien ini.", "No unbilled time entries for this client.")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={toggleAll}
        >
          {selected.size === timeEntries.length ? t("Batal Pilih Semua", "Deselect All") : t("Pilih Semua", "Select All")}
        </Button>
        <Button
          size="sm"
          onClick={handleImport}
          disabled={loading || selected.size === 0}
        >
          {loading ? t("Mengimpor...", "Importing...") : t(`Import ${selected.size} Dipilih`, `Import ${selected.size} Selected`)}
        </Button>
      </div>
      <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
        {timeEntries.map((te) => {
          const mins = te.durationMinutes || 0;
          const hours = (mins / 60).toFixed(1);
          const rate = te.hourlyRate ? Number(te.hourlyRate) : 0;
          const amount = (Number(hours) * rate).toFixed(2);
          const isSelected = selected.has(te.id);

          return (
            <div
              key={te.id}
              className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                isSelected ? "bg-muted/70" : ""
              }`}
              onClick={() => toggle(te.id)}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(te.id)}
                className="shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  {te.description || "Tanpa deskripsi"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hours}{t("j", "h")} @ {formatMoney(rate, currency)}/{t("jam", "hr")} = {formatMoney(amount, currency)}
                </p>
              </div>
              <Badge variant={timeEntryStatusVariant(te.status, lang).variant} className="text-[10px]">
                {timeEntryStatusVariant(te.status, lang).label}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
