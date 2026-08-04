"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { localDateIso, shiftDateIso, weekStartDate } from "@/lib/effective-work-date";
import { useT } from "@/lib/i18n-client";

export function WaktuNavigation({
  view,
  selectedDate,
  actions,
}: {
  view: "daily" | "weekly";
  selectedDate: string;
  actions?: React.ReactNode;
}) {
  const { t, lang } = useT();
  const router = useRouter();
  const locale = lang === "en" ? "en-US" : "id-ID";
  const step = view === "weekly" ? 7 : 1;
  const today = localDateIso(new Date());
  const weekStart = localDateIso(weekStartDate(new Date(`${selectedDate}T12:00:00`)));
  const dates = view === "weekly"
    ? [new Date(`${weekStart}T00:00:00.000Z`), new Date(`${shiftDateIso(weekStart, 6)}T00:00:00.000Z`)]
    : [new Date(`${selectedDate}T00:00:00.000Z`)];
  const label = view === "weekly"
    ? `${dates[0].toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" })} – ${dates[1].toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`
    : dates[0].toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const href = (date: string) => `/app/time?view=${view}&date=${date}`;

  const selectedDateObj = new Date(`${selectedDate}T12:00:00`);

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    const iso = localDateIso(date);
    router.push(href(iso));
  };

  return <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="flex items-center gap-2 sm:gap-2.5 rounded-full border bg-muted/40 p-1 text-xs">
      <Button asChild variant="ghost" size="icon" className="h-7 w-7 rounded-full shrink-0" aria-label={t("Periode sebelumnya", "Previous period")}><Link href={href(shiftDateIso(selectedDate, -step))}><ChevronLeft className="h-3.5 w-3.5" /></Link></Button>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex min-w-32 items-center justify-center gap-2 px-3 py-1 text-center font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-md hover:bg-muted/60 mx-1"
            aria-label={t("Pilih tanggal", "Pick a date")}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={selectedDateObj}
            onSelect={handleCalendarSelect}
            locale={lang === "en" ? undefined : undefined}
            weekStartsOn={1}
          />
        </PopoverContent>
      </Popover>
      <Button asChild variant="ghost" size="icon" className="h-7 w-7 rounded-full" aria-label={t("Periode berikutnya", "Next period")}><Link href={href(shiftDateIso(selectedDate, step))}><ChevronRight className="h-3.5 w-3.5" /></Link></Button>
      <Button asChild variant="ghost" size="sm" className="h-7 rounded-full px-2 text-xs"><Link href={href(today)}>{view === "weekly" ? t("Minggu ini", "This week") : t("Hari ini", "Today")}</Link></Button>
    </div>
    {actions && (
      <div className="grid w-full grid-cols-2 gap-2 [&>*:last-child]:col-span-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end sm:[&>*:last-child]:col-span-1">
        {actions}
      </div>
    )}
  </div>;
}
