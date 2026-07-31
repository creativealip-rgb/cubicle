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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type TemplateRow = { id: string; name: string; description: string | null; target: "fixed_price" | "hourly_retainer" | "all"; status: "active" | "archived"; items?: Array<{ id: string; title: string; position: number }> };
const targetLabel={fixed_price:"Harga Tetap",hourly_retainer:"Per Jam / Retainer",all:"Semua Project"};

function TemplateFormDialog({template,onSave}:{template?:TemplateRow;onSave:(value:{name:string;description?:string;target:"fixed_price"|"hourly_retainer"|"all"})=>Promise<void>}){
 const [open,setOpen]=useState(false);const [name,setName]=useState(template?.name??"");const [description,setDescription]=useState(template?.description??"");const [target,setTarget]=useState<"fixed_price"|"hourly_retainer"|"all">(template?.target??"all");
 return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" variant={template?"outline":"default"}>{template?"Ubah Template":"Buat Template"}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{template?"Ubah Template":"Buat Template"}</DialogTitle></DialogHeader><form className="space-y-3" onSubmit={async e=>{e.preventDefault();await onSave({name,description:description||undefined,target});setOpen(false)}}><div><Label>Nama</Label><Input value={name} onChange={e=>setName(e.target.value)} required/></div><div><Label>Deskripsi</Label><Input value={description} onChange={e=>setDescription(e.target.value)}/></div><div><Label>Target</Label><select className="w-full rounded-md border bg-background p-2" value={target} onChange={e=>setTarget(e.target.value as typeof target)}><option value="fixed_price">Harga Tetap</option><option value="hourly_retainer">Per Jam / Retainer</option><option value="all">Semua Project</option></select></div><Button type="submit">Simpan</Button></form></DialogContent></Dialog>
}

export function TaskTemplateWorkspace({ templates, projects }: { templates: TemplateRow[]; projects: Array<{ id: string; name: string }> }) {
  const router = useRouter(); const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  async function run(action: () => Promise<unknown>) { try { await action(); router.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Aksi gagal"); } }
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2">
      <TemplateFormDialog onSave={value=>run(()=>createTaskTemplate({...value,status:"active"}))}/>
      {projects.length ? <select className="rounded-md border bg-background px-3 text-sm" value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select> : null}
      {projectId ? <TaskTemplateImportDialog projectId={projectId} templates={templates.map(({ id, name: label, target }) => ({ id, name: label, target }))} /> : null}
    </div>
    {templates.length===0?<p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada template tugas.</p>:<div className="overflow-hidden rounded-lg border bg-card">{templates.map((template) => <div key={template.id} className="border-b p-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{template.name}</span><span className="text-xs text-muted-foreground">{targetLabel[template.target]} · {template.status}</span>
        <div className="ml-auto flex gap-1">{template.status==="active"&&<TemplateFormDialog template={template} onSave={value=>run(()=>updateTaskTemplate(template.id,value))}/>}<Button size="sm" variant="outline" onClick={() => run(() => duplicateTaskTemplate(template.id))}>Duplikat</Button><Button size="sm" variant="outline" onClick={() => run(() => template.status === "active" ? archiveTaskTemplate(template.id) : restoreTaskTemplate(template.id))}>{template.status === "active" ? "Arsipkan" : "Pulihkan"}</Button></div>
      </div>
      <div className="mt-3 space-y-1">{(template.items ?? []).map((item, index, all) => <div key={item.id} className="flex items-center gap-2 text-sm"><span className="flex-1">{item.title}</span><Button size="sm" variant="ghost" disabled={index === 0} onClick={() => run(() => reorderTaskTemplateItems(template.id, [item.id, ...all.filter((entry) => entry.id !== item.id).map((entry) => entry.id)]))}>↑</Button><Button size="sm" variant="ghost" onClick={() => run(() => removeTaskTemplateItem(item.id))}>Hapus</Button></div>)}</div>
      {template.status === "active" ? <Button className="mt-2" size="sm" variant="ghost" onClick={() => run(() => createTaskTemplateItem(template.id, { title: "Item baru", position: template.items?.length ?? 0 }))}>Tambah item</Button> : null}
    </div>)}</div>}
  </div>;
}
