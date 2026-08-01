"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createManualEntry } from "@/lib/actions/time";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { localDateIso } from "@/lib/effective-work-date";

type Project = { id: string; name: string; customerRef: string | null };
type Task = { id: string; title: string; projectRef: string | null };

export function AddTimeLogDialog({ workspaceId, projects, tasks }: { workspaceId: string; projects: Project[]; tasks: Task[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => localDateIso(new Date()));
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const projectTasks = useMemo(() => tasks.filter((task) => task.projectRef === projectId), [projectId, tasks]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const project = projects.find((item) => item.id === projectId);
    const durationMinutes = Number(hours || 0) * 60 + Number(minutes || 0);
    if (!project?.customerRef || !taskId || !description.trim() || durationMinutes <= 0) {
      toast.error("Project, Task, deskripsi, dan durasi wajib diisi");
      return;
    }
    setLoading(true);
    try {
      const customerKey = "client" + "Id";
      await createManualEntry({
        workspaceId,
        [customerKey]: project.customerRef,
        projectId,
        taskId,
        description: description.trim(),
        date,
        durationMinutes,
        billable: true,
      } as Parameters<typeof createManualEntry>[0]);
      setOpen(false);
      setProjectId(""); setTaskId(""); setDescription(""); setHours("0"); setMinutes("0");
      toast.success("Waktu tercatat");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mencatat waktu");
    } finally { setLoading(false); }
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button className="h-11 w-full gap-2 sm:h-9 sm:w-auto"><Plus className="h-4 w-4" />Catat Waktu</Button></DialogTrigger>
    <DialogContent className="flex max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
      <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12"><DialogTitle>Catat Waktu</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="manual-time-project" className="text-xs">Project *</Label>
            <Select value={projectId} onValueChange={(value) => { setProjectId(value); setTaskId(""); }}>
              <SelectTrigger id="manual-time-project" className="h-9 text-sm"><SelectValue placeholder="Pilih project" /></SelectTrigger>
              <SelectContent>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-time-task" className="text-xs">Task *</Label>
            <Select value={taskId} onValueChange={setTaskId} disabled={!projectId}>
              <SelectTrigger id="manual-time-task" className="h-9 text-sm"><SelectValue placeholder="Pilih task" /></SelectTrigger>
              <SelectContent>{projectTasks.map((task) => <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="manual-time-description" className="text-xs">Deskripsi *</Label>
          <Textarea id="manual-time-description" value={description} onChange={(event) => setDescription(event.target.value)} required className="min-h-24 resize-none" placeholder="Ngerjain apa aja?" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_88px_88px]">
          <div className="space-y-2"><Label htmlFor="manual-time-date" className="text-xs">Tanggal</Label><Input id="manual-time-date" className="h-9 text-sm" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="manual-time-hours" className="text-xs">Jam</Label><Input id="manual-time-hours" className="h-9 text-sm" type="number" min="0" value={hours} onChange={(event) => setHours(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="manual-time-minutes" className="text-xs">Menit</Label><Input id="manual-time-minutes" className="h-9 text-sm" type="number" min="0" max="59" value={minutes} onChange={(event) => setMinutes(event.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Batal</Button>
          <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
