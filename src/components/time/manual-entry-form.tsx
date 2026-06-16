"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createManualEntry } from "@/lib/actions/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
}

interface ManualEntryFormProps {
  workspaceId: string;
  clients: Client[];
  projects: Project[];
  tasks: Task[];
}

export function ManualEntryForm({ workspaceId, clients, projects, tasks }: ManualEntryFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [billable, setBillable] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !projectId) {
      toast.error("Client and project required");
      return;
    }
    const durationMinutes = parseInt(hours || "0") * 60 + parseInt(minutes || "0");
    if (durationMinutes <= 0) {
      toast.error("Duration must be greater than 0");
      return;
    }
    setLoading(true);
    try {
      await createManualEntry({
        workspaceId,
        clientId,
        projectId,
        taskId: taskId || undefined,
        description: description || undefined,
        date,
        durationMinutes,
        billable,
      });
      toast.success("Time entry added");
      setOpen(false);
      setClientId("");
      setProjectId("");
      setTaskId("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setHours("0");
      setMinutes("0");
      setBillable(true);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add entry");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Plus className="h-3 w-3" /> Manual Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Manual Time Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Project *</Label>
              <Select value={projectId} onValueChange={setProjectId} disabled={!clientId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Task (optional)</Label>
            <Select value={taskId} onValueChange={setTaskId} disabled={!projectId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select task" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {tasks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Date *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Hours</Label>
              <Input
                type="number"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Minutes</Label>
              <Input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="billable"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="billable" className="text-sm">Billable</Label>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Add Entry
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
