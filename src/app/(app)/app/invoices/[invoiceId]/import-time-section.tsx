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
  /** Resolved rate for preview (entry → project → workspace default). */
  effectiveRate?: number;
  projectName?: string | null;
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

  const allSelected =
    timeEntries.length > 0 && selected.size === timeEntries.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(timeEntries.map((entry) => entry.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function toggleAll() {
    if (allSelected) clearSelection();
    else selectAll();
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={allSelected ? "secondary" : "outline"}
            size="sm"
            className="text-xs"
            onClick={toggleAll}
          >
            {allSelected
              ? t("Batal Pilih Semua", "Deselect All")
              : t(`Pilih Semua (${timeEntries.length})`, `Select All (${timeEntries.length})`)}
          </Button>
          {someSelected && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={clearSelection}
            >
              {t("Kosongkan", "Clear")}
            </Button>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleImport}
          disabled={loading || selected.size === 0}
        >
          {loading
            ? t("Mengimpor...", "Importing...")
            : t(`Import ${selected.size} Dipilih`, `Import ${selected.size} Selected`)}
        </Button>
      </div>

      <div className="border rounded-lg max-h-72 overflow-y-auto">
        {/* Master select-all row */}
        <label className="sticky top-0 z-10 flex cursor-pointer items-center gap-3 border-b bg-muted/40 px-3 py-2.5 hover:bg-muted/60">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={toggleAll}
            className="h-4 w-4 shrink-0 accent-primary"
            aria-label={t("Pilih semua catatan waktu", "Select all time entries")}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {allSelected
                ? t("Semua dipilih", "All selected")
                : someSelected
                  ? t(`${selected.size} dari ${timeEntries.length} dipilih`, `${selected.size} of ${timeEntries.length} selected`)
                  : t("Pilih semua", "Select all")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t(
                `${timeEntries.length} catatan belum ditagih · klik baris ini untuk pilih/batal semua`,
                `${timeEntries.length} unbilled entries · click this row to select/deselect all`,
              )}
            </p>
          </div>
        </label>

        <div className="divide-y">
          {timeEntries.map((te) => {
            const mins = te.durationMinutes || 0;
            const hours = mins / 60;
            const storedRate = te.hourlyRate ? Number(te.hourlyRate) : 0;
            const rate =
              te.effectiveRate && te.effectiveRate > 0
                ? te.effectiveRate
                : storedRate > 0
                  ? storedRate
                  : 0;
            const amount = hours * rate;
            const isSelected = selected.has(te.id);
            const zeroRate = !rate || !Number.isFinite(rate) || rate <= 0;
            const rateFromFallback = !zeroRate && storedRate <= 0;

            return (
              <div
                key={te.id}
                role="button"
                tabIndex={0}
                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                  isSelected ? "bg-muted/70" : ""
                }`}
                onClick={() => toggle(te.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(te.id);
                  }
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(te.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 shrink-0 accent-primary"
                  aria-label={te.description || t("Pilih catatan waktu", "Select time entry")}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    {te.description || t("Tanpa deskripsi", "No description")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {te.projectName ? `${te.projectName} · ` : ""}
                    {hours.toFixed(1)}{t("j", "h")}
                    {zeroRate
                      ? t(
                          " · tarif 0 (isi rate di time entry / project / default workspace)",
                          " · rate 0 (set rate on time entry / project / workspace default)",
                        )
                      : ` @ ${formatMoney(rate, currency)}/${t("jam", "hr")} = ${formatMoney(amount, currency)}${
                          rateFromFallback
                            ? t(" · pakai default", " · using default")
                            : ""
                        }`}
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
    </div>
  );
}
