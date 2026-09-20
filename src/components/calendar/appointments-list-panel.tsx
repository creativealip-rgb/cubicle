"use client";

import { useState } from "react";
import { Clock, CalendarDays, CheckCircle2, XCircle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { AppointmentActions } from "@/components/calendar/calendar-item-actions";
import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";

export type AppointmentItem = {
  id: string;
  title: string;
  notes: string | null;
  attendeeName: string | null;
  attendeeEmail: string | null;
  startTime: Date | string;
  endTime: Date | string;
  status: string;
  userId: string;
  userName: string | null;
};

const MAX_DISPLAY_PER_TAB = 10;

export function AppointmentsListPanel({
  appointments,
  locale = "id-ID",
}: {
  appointments: AppointmentItem[];
  locale?: string;
}) {
  const { t } = useT();
  const [tab, setTab] = useState<"upcoming" | "completed" | "cancelled">("upcoming");

  const now = new Date();

  const allFiltered = appointments.filter((item) => {
    const itemDate = new Date(item.startTime);
    if (tab === "upcoming") {
      return item.status === "scheduled" && itemDate >= now;
    }
    if (tab === "completed") {
      return item.status === "completed" || (item.status === "scheduled" && itemDate < now);
    }
    if (tab === "cancelled") {
      return item.status === "cancelled";
    }
    return true;
  });

  const displayList = allFiltered.slice(0, MAX_DISPLAY_PER_TAB);

  const counts = {
    upcoming: appointments.filter((item) => item.status === "scheduled" && new Date(item.startTime) >= now).length,
    completed: appointments.filter((item) => item.status === "completed" || (item.status === "scheduled" && new Date(item.startTime) < now)).length,
    cancelled: appointments.filter((item) => item.status === "cancelled").length,
  };

  function formatTime(d: string | Date): string {
    return new Date(d).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function parseDateBadge(d: string | Date) {
    const dateObj = new Date(d);
    return {
      month: dateObj.toLocaleDateString(locale, { month: "short" }).toUpperCase(),
      day: dateObj.toLocaleDateString(locale, { day: "2-digit" }),
      weekday: dateObj.toLocaleDateString(locale, { weekday: "short" }),
    };
  }

  return (
    <div className="space-y-3">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-border/80 pb-2">
        <button
          type="button"
          onClick={() => setTab("upcoming")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
            tab === "upcoming"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          <span>{t("Mendatang", "Upcoming")}</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
              tab === "upcoming"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {counts.upcoming}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab("completed")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
            tab === "completed"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          <span>{t("Selesai", "Completed")}</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
              tab === "completed"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {counts.completed}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab("cancelled")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
            tab === "cancelled"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          <span>{t("Dibatalkan", "Cancelled")}</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
              tab === "cancelled"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {counts.cancelled}
          </span>
        </button>
      </div>

      {/* List Content */}
      {displayList.length === 0 ? (
        <div className="flex h-56 items-center justify-center">
          <EmptyState
            icon={CalendarDays}
            title={
              tab === "upcoming"
                ? t("Belum ada janji temu mendatang", "No upcoming appointments")
                : tab === "completed"
                ? t("Belum ada riwayat sesi selesai", "No completed appointments yet")
                : t("Tidak ada janji temu dibatalkan", "No cancelled appointments")
            }
            description={
              tab === "upcoming"
                ? t(
                    "Bagikan link booking kamu agar klien bisa menjadwalkan sesi secara mandiri",
                    "Share your booking link so clients can schedule themselves"
                  )
                : ""
            }
            embedded
          />
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {displayList.map((item) => {
            const dateInfo = parseDateBadge(item.startTime);
            const isPast = new Date(item.startTime) < now;
            return (
              <div
                key={item.id}
                className="group flex flex-col gap-3 py-3 transition-colors first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex flex-col items-center justify-center rounded-lg border border-border/80 bg-muted/30 px-2 py-1 min-w-12 text-center shrink-0">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">
                      {dateInfo.month}
                    </span>
                    <span className="text-base font-extrabold text-foreground leading-tight">
                      {dateInfo.day}
                    </span>
                    <span className="text-[9px] text-muted-foreground uppercase leading-none">
                      {dateInfo.weekday}
                    </span>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {item.title || t("Sesi Diskusi", "Discussion Session")}
                      </p>
                      {item.status === "cancelled" ? (
                        <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                          <XCircle className="h-3 w-3" />
                          {t("Dibatalkan", "Cancelled")}
                        </span>
                      ) : item.status === "completed" || isPast ? (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                          <CheckCircle2 className="h-3 w-3" />
                          {t("Selesai", "Completed")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {t("Terjadwal", "Scheduled")}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                        {formatTime(item.startTime)} – {formatTime(item.endTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span className="font-medium text-foreground">{item.attendeeName}</span>
                        {item.attendeeEmail && (
                          <span className="text-muted-foreground">({item.attendeeEmail})</span>
                        )}
                      </span>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-muted-foreground/90 bg-muted/40 rounded p-1.5 mt-1 line-clamp-2">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <AppointmentActions
                    id={item.id}
                    title={item.title || "Sesi Diskusi"}
                    status={item.status}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
