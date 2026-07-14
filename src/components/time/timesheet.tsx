"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteTimeEntry } from "@/lib/actions/time";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import {
  Clock,
  Trash2,
  DollarSign,
  Filter,
} from "lucide-react";
import { useT } from "@/lib/i18n-client";

interface TimeEntry {
  id: string;
  description: string | null;
  tags: string | null;
  durationMinutes: number | null;
  billable: boolean;
  hourlyRate: string | number | null;
  startTime: Date | string | null;
  endTime: Date | string | null;
  status: string;
  clientName: string | null;
  projectName: string | null;
  projectCurrency: string | null;
  taskTitle: string | null;
  userName: string | null;
  createdAt: Date | string;
}

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface TimesheetProps {
  entries: TimeEntry[];
  clients: Client[];
  projects: Project[];
}

  // eslint-disable-next-line unused-imports/no-unused-vars
export function Timesheet({ entries, clients, projects }: TimesheetProps) {
  const { t } = useT();
  const router = useRouter();

  // Filters
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [billableFilter, setBillableFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (clientFilter !== "all" && e.clientName !== clientFilter) return false;
      if (projectFilter !== "all" && e.projectName !== projectFilter) return false;
      if (billableFilter === "billable" && !e.billable) return false;
      if (billableFilter === "non-billable" && e.billable) return false;
      if (tagFilter !== "all" && !String(e.tags || "").split(",").map((tag) => tag.trim()).includes(tagFilter)) return false;
      if (dateFrom) {
        const entryDate = e.startTime ? new Date(e.startTime).toISOString().split("T")[0] : "";
        if (entryDate < dateFrom) return false;
      }
      if (dateTo) {
        const entryDate = e.startTime ? new Date(e.startTime).toISOString().split("T")[0] : "";
        if (entryDate > dateTo) return false;
      }
      return true;
    });
  }, [entries, clientFilter, projectFilter, billableFilter, tagFilter, dateFrom, dateTo]);

  const totalMinutes = useMemo(
    () => filteredEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0),
    [filteredEntries],
  );

  const billableMinutes = useMemo(
    () => filteredEntries.filter((e) => e.billable).reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0),
    [filteredEntries],
  );

  function formatDuration(minutes: number | null): string {
    if (!minutes) return "0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  }

  function formatRate(rate: string | number | null, currency: string | null): string | null {
    if (rate === null || rate === "") return null;
    const numericRate = Number(rate);
    if (!Number.isFinite(numericRate) || numericRate <= 0) return null;
    const cur = (currency || "IDR").toUpperCase();
    // IDR has no decimals; foreign currencies (USD/EUR/etc) keep 2 decimals.
    const localeMap: Record<string, string> = { IDR: "id-ID", USD: "en-US", EUR: "de-DE" };
    return new Intl.NumberFormat(localeMap[cur] || "en-US", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: cur === "IDR" ? 0 : 2,
    }).format(numericRate);
  }

  async function handleDelete(entryId: string) {
    try {
      await deleteTimeEntry(entryId);
      toast.success(t("Entri dihapus", "Entry deleted"));
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal menghapus", "Failed to delete"));
    }
  }

  const uniqueClients = useMemo(() => {
    const set = new Set(entries.map((e) => e.clientName).filter(Boolean));
    return Array.from(set) as string[];
  }, [entries]);

  const uniqueProjects = useMemo(() => {
    const set = new Set(entries.map((e) => e.projectName).filter(Boolean));
    return Array.from(set) as string[];
  }, [entries]);

  const uniqueTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((entry) => {
      String(entry.tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .forEach((tag) => set.add(tag));
    });
    return Array.from(set);
  }, [entries]);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Waktu</p>
            <p className="text-xl font-bold">{formatDuration(totalMinutes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Bisa Ditagih</p>
            <p className="text-xl font-bold">{formatDuration(billableMinutes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Entri</p>
            <p className="text-xl font-bold">{filteredEntries.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px]">Klien</Label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Klien</SelectItem>
                  {uniqueClients.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Proyek</Label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Proyek</SelectItem>
                  {uniqueProjects.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Bisa Ditagih</Label>
              <Select value={billableFilter} onValueChange={setBillableFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="billable">Bisa Ditagih</SelectItem>
                  <SelectItem value="non-billable">Tidak Ditagih</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Tag</Label>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tag</SelectItem>
                  {uniqueTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row col-span-2 md:col-span-1">
              <div className="space-y-1 flex-1 min-w-0">
                <Label className="text-[10px]">Dari</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <Label className="text-[10px]">Sampai</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entries table */}
      {filteredEntries.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Belum ada catatan waktu"
          description="Mulai timer di atas atau tambah entri manual untuk mulai melacak waktu kerjamu. Kalau sudah ada data, coba sesuaikan filter."
        />
      ) : (
        <div className="space-y-2">
          {filteredEntries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {entry.description || "Untitled"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {entry.clientName && <span>{entry.clientName}</span>}
                      {entry.projectName && (
                        <>
                          <span>·</span>
                          <span>{entry.projectName}</span>
                        </>
                      )}
                      {entry.taskTitle && (
                        <>
                          <span>·</span>
                          <span>{entry.taskTitle}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{entry.userName || "Unknown"}</span>
                      <span>·</span>
                      <span>
                        {entry.startTime
                          ? new Date(entry.startTime).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                    {entry.tags && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {entry.tags.split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {entry.billable && (
                    <Badge variant="outline" className="text-[10px] gap-0.5">
                      <DollarSign className="h-2.5 w-2.5" />
                      {formatRate(entry.hourlyRate, entry.projectCurrency) ? `${formatRate(entry.hourlyRate, entry.projectCurrency)} / ${t("jam", "hr")}` : "Billable"}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px]">
                    {formatDuration(entry.durationMinutes)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
