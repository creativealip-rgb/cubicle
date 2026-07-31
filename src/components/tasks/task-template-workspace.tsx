"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskTemplateImportDialog } from "@/components/tasks/task-template-import-dialog";
import {
  archiveTaskTemplate, createTaskTemplate, createTaskTemplateItem, duplicateTaskTemplate,
  removeTaskTemplateItem, reorderTaskTemplateItems, restoreTaskTemplate, updateTaskTemplate,
} from "@/lib/actions/task-templates";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type TemplateRow = { id: string; name: string; description: string | null; target: "fixed_price" | "hourly_retainer" | "all"; status: "active" | "archived"; items?: Array<{ id: string; title: string; position: number }> };

export function TaskTemplateWorkspace({ templates, projects }: { templates: TemplateRow[]; projects: Array<{ id: string; name: string }> }) {
  const router = useRouter(); const [name, setName] = useState(""); const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  async function run(action: () => Promise<unknown>) { try { await action(); router.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Aksi gagal"); } }
  return <div className="space-y-4">
    <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); run(() => createTaskTemplate({ name, target: "all", status: "active" })).then(() => setName("")); }}>
      <Input className="max-w-sm" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama template" required />
      <Button type="submit">Buat Template</Button>
      {projects.length ? <select className="rounded-md border bg-background px-3 text-sm" value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select> : null}
      {projectId ? <TaskTemplateImportDialog projectId={projectId} templates={templates.map(({ id, name: label, target }) => ({ id, name: label, target }))} /> : null}
    </form>
    <div className="overflow-hidden rounded-lg border bg-card">{templates.map((template) => <div key={template.id} className="border-b p-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2"><button className="font-medium" onDoubleClick={() => run(() => updateTaskTemplate(template.id, { name: `${template.name} edit` }))}>{template.name}</button><span className="text-xs text-muted-foreground">{template.target} · {template.status}</span>
        <div className="ml-auto flex gap-1"><Button size="sm" variant="outline" onClick={() => run(() => duplicateTaskTemplate(template.id))}>Duplikat</Button><Button size="sm" variant="outline" onClick={() => run(() => template.status === "active" ? archiveTaskTemplate(template.id) : restoreTaskTemplate(template.id))}>{template.status === "active" ? "Arsipkan" : "Pulihkan"}</Button></div>
      </div>
      <div className="mt-3 space-y-1">{(template.items ?? []).map((item, index, all) => <div key={item.id} className="flex items-center gap-2 text-sm"><span className="flex-1">{item.title}</span><Button size="sm" variant="ghost" disabled={index === 0} onClick={() => run(() => reorderTaskTemplateItems(template.id, [item.id, ...all.filter((entry) => entry.id !== item.id).map((entry) => entry.id)]))}>↑</Button><Button size="sm" variant="ghost" onClick={() => run(() => removeTaskTemplateItem(item.id))}>Hapus</Button></div>)}</div>
      {template.status === "active" ? <Button className="mt-2" size="sm" variant="ghost" onClick={() => run(() => createTaskTemplateItem(template.id, { title: "Item baru", position: template.items?.length ?? 0 }))}>Tambah item</Button> : null}
    </div>)}</div>
  </div>;
}
