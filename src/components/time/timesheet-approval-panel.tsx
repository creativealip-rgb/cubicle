"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { submitWeeklyTimesheet, reviewWeeklyTimesheet } from "@/lib/actions/timesheet-approval";

export interface ApprovalItem { id:string; userName:string|null; weekStart:string; status:string; totalMinutes:number; billableMinutes:number; submitterNote:string|null; reviewNote:string|null }
export function TimesheetApprovalPanel({ weekStart, current, pending = [], isOwner }: { weekStart:string; current:ApprovalItem|null; pending?:ApprovalItem[]; isOwner:boolean }) {
 const router=useRouter(); const [note,setNote]=useState(""); const [busy,setBusy]=useState(false);
 async function submit(){setBusy(true);try{await submitWeeklyTimesheet({weekStart,note});toast.success("Timesheet dikirim");router.refresh()}catch(e){toast.error(e instanceof Error?e.message:"Gagal mengirim")}finally{setBusy(false)}}
 async function review(id:string,decision:"approved"|"rejected"){if(decision==="rejected"&&!note.trim()){toast.error("Catatan penolakan wajib diisi");return}setBusy(true);try{await reviewWeeklyTimesheet({submissionId:id,decision,note});toast.success(decision==="approved"?"Timesheet disetujui":"Timesheet ditolak");setNote("");router.refresh()}catch(e){toast.error(e instanceof Error?e.message:"Gagal review")}finally{setBusy(false)}}
 return <Card><CardContent className="space-y-3 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium">Persetujuan timesheet mingguan</p><p className="text-xs text-muted-foreground">Minggu {weekStart}</p></div>{current?<Badge>{current.status}</Badge>:<Badge variant="secondary">draft</Badge>}</div>
 {current?.reviewNote&&<p className="rounded-md bg-muted p-2 text-sm">Catatan reviewer: {current.reviewNote}</p>}
 {(!current||current.status==="rejected")&&<div className="flex flex-col gap-2 sm:flex-row"><Input value={note} onChange={e=>setNote(e.target.value)} placeholder="Catatan opsional"/><Button disabled={busy} onClick={submit}>Kirim timesheet</Button></div>}
 {isOwner&&pending.length>0&&<div className="space-y-2 border-t pt-3"><p className="text-sm font-medium">Menunggu review</p>{pending.map(item=><div key={item.id} className="rounded-md border p-3"><div className="flex justify-between gap-2"><div><p className="text-sm font-medium">{item.userName||"Anggota"}</p><p className="text-xs text-muted-foreground">{item.weekStart} · {(item.totalMinutes/60).toFixed(1)} jam</p></div><Badge>submitted</Badge></div>{item.submitterNote&&<p className="mt-2 text-xs">{item.submitterNote}</p>}<div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input value={note} onChange={e=>setNote(e.target.value)} placeholder="Catatan review"/><Button disabled={busy} onClick={()=>review(item.id,"approved")}>Setujui</Button><Button disabled={busy} variant="destructive" onClick={()=>review(item.id,"rejected")}>Tolak</Button></div></div>)}</div>}
 </CardContent></Card>
}
