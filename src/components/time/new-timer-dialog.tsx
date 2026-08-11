"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { startTimer } from "@/lib/actions/time";
import { useT } from "@/lib/i18n-client";
import { Button } from "@/components/ui/button";

type Project = { id: string; name: string; customerRef: string | null };
type Task = { id: string; title: string; projectRef: string | null };

export function NewTimerDialog({
  workspaceId,
  // Keep props for route compatibility; timer may be detailed later from active/timesheet edit.
  projects: _projects,
  tasks: _tasks,
  initialOpen = false,
}: {
  workspaceId: string;
  projects: Project[];
  tasks: Task[];
  initialOpen?: boolean;
}) {
  const router = useRouter();
  const { t } = useT();
  const [loading, setLoading] = useState(initialOpen);

  async function startEmptyTimer() {
    if (loading) return;
    setLoading(true);
    try {
      await startTimer({ workspaceId });
      window.dispatchEvent(new CustomEvent("cubicle:timer-changed"));
      toast.success(t("Timer dimulai. Detail bisa diisi setelah selesai lewat timesheet.", "Timer started. Details can be filled after stopping from the timesheet."));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memulai timer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" className="h-11 w-full gap-2 sm:h-9 sm:w-auto" onClick={startEmptyTimer} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
      {t("Mulai Timer", "Start Timer")}
    </Button>
  );
}