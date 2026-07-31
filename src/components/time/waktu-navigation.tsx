"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localDateIso, shiftDateIso, weekStartDate } from "@/lib/effective-work-date";

export function WaktuNavigation({
  view,
  selectedDate,
  actions,
}: {
  view: "daily" | "weekly";
  selectedDate: string;
  actions?: React.ReactNode;
}) {
  const step = view === "weekly" ? 7 : 1;
  const today = localDateIso(new Date());
  const weekStart = localDateIso(weekStartDate(new Date(`${selectedDate}T12:00:00`)));
  const dates = view === "weekly"
    ? [new Date(`${weekStart}T00:00:00.000Z`), new Date(`${shiftDateIso(weekStart, 6)}T00:00:00.000Z`)]
    : [new Date(`${selectedDate}T00:00:00.000Z`)];
  const label = view === "weekly"
    ? `${dates[0].toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })} – ${dates[1].toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`
    : dates[0].toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const href = (date: string) => `/app/time?view=${view}&date=${date}`;

  return <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="flex items-center gap-1 rounded-full border bg-muted/40 p-1 text-xs">
      <Button asChild variant="ghost" size="icon" className="h-7 w-7 rounded-full" aria-label="Periode sebelumnya"><Link href={href(shiftDateIso(selectedDate, -step))}><ChevronLeft className="h-3.5 w-3.5" /></Link></Button>
      <span className="min-w-28 px-1 text-center font-medium text-muted-foreground">{label}</span>
      <Button asChild variant="ghost" size="icon" className="h-7 w-7 rounded-full" aria-label="Periode berikutnya"><Link href={href(shiftDateIso(selectedDate, step))}><ChevronRight className="h-3.5 w-3.5" /></Link></Button>
      <Button asChild variant="ghost" size="sm" className="h-7 rounded-full px-2 text-xs"><Link href={href(today)}>{view === "weekly" ? "Minggu ini" : "Hari ini"}</Link></Button>
    </div>
    {actions && (
      <div className="grid w-full grid-cols-2 gap-2 [&>*:last-child]:col-span-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end sm:[&>*:last-child]:col-span-1">
        {actions}
      </div>
    )}
  </div>;
}
