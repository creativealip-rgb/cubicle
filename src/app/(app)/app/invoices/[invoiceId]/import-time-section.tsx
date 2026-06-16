"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { importTimeEntries } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
}: {
  invoiceId: string;
  timeEntries: TimeEntry[];
}) {
  const router = useRouter();
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
      toast.error("Select at least one time entry");
      return;
    }
    setLoading(true);
    try {
      await importTimeEntries({
        invoiceId,
        timeEntryIds: Array.from(selected),
      });
      toast.success(`Imported ${selected.size} time entries`);
      setSelected(new Set());
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (timeEntries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No unbilled time entries for this client.
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
          {selected.size === timeEntries.length ? "Deselect All" : "Select All"}
        </Button>
        <Button
          size="sm"
          onClick={handleImport}
          disabled={loading || selected.size === 0}
        >
          {loading ? "Importing..." : `Import ${selected.size} Selected`}
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
                  {te.description || "No description"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hours}h @ {rate}/hr = {amount}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {te.status}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
