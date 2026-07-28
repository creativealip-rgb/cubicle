"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localDateIso, shiftDateIso, weekStartDate } from "@/lib/effective-work-date";

export function WaktuNavigation({ view, selectedDate }: { view: "daily" | "weekly"; selectedDate: string }) {
  const step = view === "weekly" ? 7 : 1;
  const today = localDateIso(new Date());
  const label = view === "weekly"
    ? `${localDateIso(weekStartDate(new Date(`${selectedDate}T12:00:00`)))} – ${shiftDateIso(localDateIso(weekStartDate(new Date(`${selectedDate}T12:00:00`))), 6)}`
    : new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date(`${selectedDate}T12:00:00`));
  const href = (date: string) => `/app/time?view=${view}&date=${date}`;

  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="icon" aria-label="Periode sebelumnya"><Link href={href(shiftDateIso(selectedDate, -step))}><ChevronLeft className="h-4 w-4" /></Link></Button>
      <span className="min-w-48 text-center text-sm font-semibold">{label}</span>
      <Button asChild variant="outline" size="icon" aria-label="Periode berikutnya"><Link href={href(shiftDateIso(selectedDate, step))}><ChevronRight className="h-4 w-4" /></Link></Button>
      <Button asChild variant="ghost" size="sm"><Link href={href(today)}>Hari Ini</Link></Button>
    </div>
    <div className="flex rounded-lg border p-1">
      <Button asChild size="sm" variant={view === "daily" ? "default" : "ghost"}><Link href={`/app/time?view=daily&date=${selectedDate}`}>Harian</Link></Button>
      <Button asChild size="sm" variant={view === "weekly" ? "default" : "ghost"}><Link href={`/app/time?view=weekly&date=${selectedDate}`}>Mingguan</Link></Button>
    </div>
  </div>;
}
