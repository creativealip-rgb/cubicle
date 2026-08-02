import { effectiveWorkDate, formatMinutes } from "@/lib/effective-work-date";
import { getCurrentLang, createT } from "@/lib/i18n";

type Entry={id:string;projectName:string|null;clientName:string|null;taskTitle:string|null;description:string|null;workDate?:string|null;startTime?:Date|string|null;createdAt?:Date|string|null;durationMinutes:number|null;manualMinutes:number|null};
export async function WaktuHistory({entries,view,selectedDate}:{entries:Entry[];view:"daily"|"weekly";selectedDate:string}){
  const lang = await getCurrentLang();
  const t = createT(lang);
  const shown=entries.filter(entry=>view==="weekly"||effectiveWorkDate(entry)===selectedDate);
  const total=shown.reduce((sum,entry)=>sum+(entry.manualMinutes??entry.durationMinutes??0),0);
  return <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-semibold">{view==="daily"?t("Harian","Daily"):t("Mingguan","Weekly")}</h2><strong>{formatMinutes(total)}</strong></div>{shown.length===0?<div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("Belum ada waktu tercatat.","No time entries yet.")}</div>:<div className="divide-y rounded-xl border">{shown.map(entry=><article key={entry.id} className="p-4"><div className="font-medium">{entry.projectName} · {entry.clientName}</div><div className="text-sm">{entry.taskTitle??t("Tanpa Task (legacy)","No task (legacy)")}</div><div className="text-sm text-muted-foreground">{entry.description}</div><div className="mt-1 text-xs font-medium">{formatMinutes(entry.manualMinutes??entry.durationMinutes??0)}</div></article>)}</div>}</section>;
}
