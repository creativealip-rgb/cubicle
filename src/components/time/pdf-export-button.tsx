"use client";

import { useMemo, useState } from "react";
import { Download, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useT } from "@/lib/i18n-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ReportType = "dashboard" | "detailed" | "full";

type ClientOpt = { id: string; name: string | null };
type ProjectOpt = { id: string; name: string | null; clientId: string | null };

const REPORT_OPTIONS: {
  value: ReportType;
  label: string;
  labelEn: string;
  desc: string;
  descEn: string;
  requiresUpgrade?: boolean;
}[] = [
  {
    value: "dashboard",
    label: "Laporan Dashboard",
    labelEn: "Dashboard Report",
    desc: "Ringkasan visual: donut chart per proyek dan task + subtotal jam.",
    descEn: "Visual summary: donut chart by project and task plus hour subtotals.",
  },
  {
    value: "detailed",
    label: "Laporan Detail",
    labelEn: "Detailed Report",
    desc: "Rincian per entry: hari, tugas, tags, duties, jam, dan amount per klien.",
    descEn: "Entry details: date, task, tags, duties, hours, and amount per client.",
    requiresUpgrade: true,
  },
  {
    value: "full",
    label: "Laporan Lengkap (keduanya)",
    labelEn: "Full Report (both)",
    desc: "Detail + Dashboard dalam satu dokumen.",
    descEn: "Detailed + Dashboard in one document.",
    requiresUpgrade: true,
  },
];

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

export function PdfExportButton({
  clients = [],
  projects = [],
  canAccessPaidReports = false,
}: {
  clients?: ClientOpt[];
  projects?: ProjectOpt[];
  canAccessPaidReports?: boolean;
}) {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<ReportType>("dashboard");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");

  // Projects filtered by selected client (cascading)
  const filteredProjects = useMemo(() => {
    if (!clientId) return projects;
    return projects.filter((p) => p.clientId === clientId);
  }, [clientId, projects]);

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

  const handleClientChange = (value: string) => {
    setClientId(value);
    // Reset project if it no longer belongs to the chosen client
    if (value && projectId) {
      const stillValid = projects.some((p) => p.id === projectId && p.clientId === value);
      if (!stillValid) setProjectId("");
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams({ report });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (clientId) params.set("clientId", clientId);
    if (projectId) params.set("projectId", projectId);
    window.open(
      `/api/time/export/pdf/va-timesheet?${params.toString()}`,
      "_blank",
      "noopener,noreferrer",
    );
    setOpen(false);
  };

  const rangeInvalid = Boolean(from && to && from > to);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-11 w-full gap-1 sm:h-8 sm:w-auto">
          <Download className="h-3 w-3" /> {t("Ekspor PDF", "Export PDF")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Ekspor PDF Lembar Waktu", "Export Timesheet PDF")}</DialogTitle>
          <DialogDescription>
            {t("Pilih jenis laporan, periode, dan filter klien/proyek.", "Pick report type, period, and client/project filters.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Report type */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{t("Jenis laporan", "Report type")}</label>
            {REPORT_OPTIONS.map((opt) => {
              const isLocked = opt.requiresUpgrade && !canAccessPaidReports;
              const active = report === opt.value;
              return (
                <div
                  key={opt.value}
                  className={`relative flex flex-col rounded-lg border transition-all ${
                    active && !isLocked
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : isLocked
                        ? "border-border/80 bg-muted/20 opacity-95"
                        : "border-border hover:bg-muted/50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!isLocked) setReport(opt.value);
                    }}
                    disabled={isLocked}
                    className="flex w-full items-start gap-3 p-3 text-left disabled:cursor-default"
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        active && !isLocked ? "border-primary" : "border-muted-foreground/40"
                      }`}
                    >
                      {active && !isLocked && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="block text-sm font-medium">{lang === "en" ? opt.labelEn : opt.label}</span>
                        {isLocked && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            <Lock className="h-2.5 w-2.5" /> PRO
                          </span>
                        )}
                      </div>
                      <span className="block text-xs text-muted-foreground">{lang === "en" ? opt.descEn : opt.desc}</span>
                    </div>
                  </button>

                  {isLocked && (
                    <div className="flex items-center justify-between border-t border-border/50 bg-muted/40 px-3 py-2 text-xs">
                      <span className="text-muted-foreground">
                        {t("Upgrade untuk mengunduh laporan ini.", "Upgrade to download report.")}
                      </span>
                      <Button asChild size="sm" variant="outline" className="h-6 gap-1 px-2 text-[11px] font-semibold text-primary">
                        <Link href="/app/billing" onClick={() => setOpen(false)}>
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          <span>{t("Tingkatkan Plan", "Upgrade Plan")}</span>
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Period */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{t("Periode", "Period")}</label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("this")}>
                {t("Bulan ini", "This month")}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("last")}>
                {t("Bulan lalu", "Last month")}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => applyPreset("clear")}>
                {t("Semua waktu", "All time")}
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
              <p className="text-xs text-destructive">{t("Tanggal awal harus sebelum tanggal akhir.", "Start date must be before end date.")}</p>
            )}
            {!from && !to && (
              <p className="text-xs text-muted-foreground">{t("Kosong = semua waktu.", "Empty = all time.")}</p>
            )}
          </div>

          {/* Client + Project */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("Klien", "Client")}</label>
              <select
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("Semua klien", "All clients")}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || t("(tanpa nama)", "(unnamed)")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("Proyek", "Project")}</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={!clientId}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{t("Semua proyek", "All projects")}</option>
                {filteredProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || t("(tanpa nama)", "(unnamed)")}
                  </option>
                ))}
              </select>
              {!clientId && (
                <p className="text-[11px] text-muted-foreground">{t("Pilih klien dulu.", "Pick a client first.")}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            {t("Batal", "Cancel")}
          </Button>
          <Button size="sm" className="gap-1" onClick={handleExport} disabled={rangeInvalid}>
            <Download className="h-3 w-3" /> Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}