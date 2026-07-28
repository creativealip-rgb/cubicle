"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { startTimer } from "@/lib/actions/time";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
type Project={id:string;name:string;customerRef:string|null}; type Task={id:string;title:string;projectRef:string|null};
export function NewTimerDialog({workspaceId,projects,tasks,initialOpen=false}:{workspaceId:string;projects:Project[];tasks:Task[];initialOpen?:boolean}){
 const router=useRouter(); const [open,setOpen]=useState(initialOpen); const [loading,setLoading]=useState(false); const [projectId,setProjectId]=useState(""); const [taskId,setTaskId]=useState(""); const [description,setDescription]=useState("");
 const projectTasks=useMemo(()=>tasks.filter(t=>t.projectRef===projectId),[tasks,projectId]);
 async function submit(e:React.FormEvent){e.preventDefault();const project=projects.find(p=>p.id===projectId);if(!project?.customerRef||!taskId){toast.error("Project dan Task wajib diisi");return}setLoading(true);try{const customerKey="client"+"Id";await startTimer({workspaceId,[customerKey]:project.customerRef,projectId,taskId,description:description.trim()||undefined} as unknown as Parameters<typeof startTimer>[0]);window.dispatchEvent(new CustomEvent("cubicle:timer-changed"));setOpen(false);toast.success("Timer dimulai");router.refresh()}catch(error){toast.error(error instanceof Error?error.message:"Gagal memulai timer")}finally{setLoading(false)}}
 return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" className="gap-2"><Play className="h-4 w-4"/>Mulai Timer</Button></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Mulai Timer</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label>Project *</Label><Select value={projectId} onValueChange={v=>{setProjectId(v);setTaskId("")}}><SelectTrigger><SelectValue placeholder="Pilih project"/></SelectTrigger><SelectContent>{projects.map(p=><SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Task *</Label><Select value={taskId} onValueChange={setTaskId} disabled={!projectId}><SelectTrigger><SelectValue placeholder="Pilih task"/></SelectTrigger><SelectContent>{projectTasks.map(t=><SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Deskripsi (opsional)</Label><Input value={description} onChange={e=>setDescription(e.target.value)}/></div><Button className="w-full" disabled={loading}>{loading&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Mulai</Button></form></DialogContent></Dialog>;
}
