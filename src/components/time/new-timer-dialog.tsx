"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { startTimer } from "@/lib/actions/time";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Project = { id: string; name: string; customerRef: string | null };
type Task = { id: string; title: string; projectRef: string | null };

export function NewTimerDialog({
  workspaceId,
  projects,
  tasks,
  initialOpen = false,
}: {
  workspaceId: string;
  projects: Project[];
  tasks: Task[];
  initialOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [description, setDescription] = useState("");

  const projectTasks = useMemo(() => tasks.filter((task) => task.projectRef === projectId), [tasks, projectId]);
  const project = projects.find((item) => item.id === projectId);
  const canSubmit = Boolean(project?.customerRef && taskId) && !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!project?.customerRef) {
      toast.error("Pilih project dulu");
      return;
    }
    if (!taskId) {
      toast.error("Pilih task dulu. Timer harus terhubung ke pekerjaan konkret.");
      return;
    }

    setLoading(true);
    try {
      await startTimer({
        workspaceId,
        clientId: project.customerRef,
        projectId,
        taskId,
        description: description.trim() || undefined,
      });
      window.dispatchEvent(new CustomEvent("cubicle:timer-changed"));
      setOpen(false);
      toast.success("Timer dimulai");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memulai timer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="start-timer-trigger">
          <Play className="h-4 w-4" />
          Mulai Timer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Mulai Timer
          </DialogTitle>
          <DialogDescription>
            Pilih project dan task dulu supaya waktu langsung masuk ke pekerjaan yang bisa ditinjau dan ditagihkan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Project *</Label>
            <Select value={projectId} onValueChange={(value) => { setProjectId(value); setTaskId(""); }}>
              <SelectTrigger data-testid="start-timer-project">
                <SelectValue placeholder="Pilih project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Task *</Label>
            <Select value={taskId} onValueChange={setTaskId} disabled={!projectId || projectTasks.length === 0}>
              <SelectTrigger data-testid="start-timer-task">
                <SelectValue placeholder={projectId ? "Pilih task" : "Pilih project dulu"} />
              </SelectTrigger>
              <SelectContent>
                {projectTasks.map((task) => <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>)}
              </SelectContent>
            </Select>
            {projectId && projectTasks.length === 0 ? (
              <p className="text-xs text-destructive">Project ini belum punya task. Buat task dulu sebelum timer dimulai.</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Deskripsi (opsional)</Label>
            <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Contoh: revisi hero section" />
          </div>
          <Button className="w-full" disabled={!canSubmit}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Mulai timer untuk task ini
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
