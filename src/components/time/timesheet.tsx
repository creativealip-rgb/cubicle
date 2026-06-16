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
import {
  Clock,
  Trash2,
  DollarSign,
  Filter,
} from "lucide-react";

interface TimeEntry {
  id: string;
  description: string | null;
  durationMinutes: number | null;
  billable: boolean;
  startTime: Date | string | null;
  endTime: Date | string | null;
  status: string;
  clientName: string | null;
  projectName: string | null;
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
  const router = useRouter();

  // Filters
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [billableFilter, setBillableFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (clientFilter !== "all" && e.clientName !== clientFilter) return false;
      if (projectFilter !== "all" && e.projectName !== projectFilter) return false;
      if (billableFilter === "billable" && !e.billable) return false;
      if (billableFilter === "non-billable" && e.billable) return false;
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
  }, [entries, clientFilter, projectFilter, billableFilter, dateFrom, dateTo]);

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

  async function handleDelete(entryId: string) {
    try {
      await deleteTimeEntry(entryId);
      toast.success("Entry deleted");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
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

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Time</p>
            <p className="text-xl font-bold">{formatDuration(totalMinutes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Billable</p>
            <p className="text-xl font-bold">{formatDuration(billableMinutes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Entries</p>
            <p className="text-xl font-bold">{filteredEntries.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px]">Client</Label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {uniqueClients.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Project</Label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {uniqueProjects.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Billable</Label>
              <Select value={billableFilter} onValueChange={setBillableFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="billable">Billable</SelectItem>
                  <SelectItem value="non-billable">Non-billable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <div className="space-y-1 flex-1">
                <Label className="text-[10px]">From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1 flex-1">
                <Label className="text-[10px]">To</Label>
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
        <div className="text-center py-12 text-sm text-muted-foreground">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
          No time entries found
        </div>
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
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {entry.billable && (
                    <Badge variant="outline" className="text-[10px] gap-0.5">
                      <DollarSign className="h-2.5 w-2.5" /> Billable
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
