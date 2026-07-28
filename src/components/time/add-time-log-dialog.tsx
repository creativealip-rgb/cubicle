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
    <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Catat Waktu</Button></DialogTrigger>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>Catat Waktu</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label>Project *</Label><Select value={projectId} onValueChange={(value) => { setProjectId(value); setTaskId(""); }}><SelectTrigger><SelectValue placeholder="Pilih project" /></SelectTrigger><SelectContent>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Task *</Label><Select value={taskId} onValueChange={setTaskId} disabled={!projectId}><SelectTrigger><SelectValue placeholder="Pilih task" /></SelectTrigger><SelectContent>{projectTasks.map((task) => <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Deskripsi *</Label><Input value={description} onChange={(event) => setDescription(event.target.value)} required /></div>
        <div className="grid grid-cols-3 gap-3"><div className="space-y-2"><Label>Tanggal</Label><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></div><div className="space-y-2"><Label>Jam</Label><Input type="number" min="0" value={hours} onChange={(event) => setHours(event.target.value)} /></div><div className="space-y-2"><Label>Menit</Label><Input type="number" min="0" max="59" value={minutes} onChange={(event) => setMinutes(event.target.value)} /></div></div>
        <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan</Button>
      </form>
    </DialogContent>
  </Dialog>;
}
