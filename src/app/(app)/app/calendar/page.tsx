import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  appointments,
  availabilityRules,
  users,
} from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Calendar, Clock, Video, CalendarDays } from "lucide-react";
import Link from "next/link";
import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { AvailabilityRuleForm } from "@/components/calendar/availability-rule-form";
import { BookingSlugForm } from "@/components/settings/booking-slug-form";
import { AppointmentActions, DeleteAvailabilityRuleButton } from "@/components/calendar/calendar-item-actions";
import { getCurrentLang, createT, getLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const locale = getLocale(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const ws = await getWorkspaceFullForCurrentUser();
  const workspaceId = ws.id;
  await assertWorkspaceMember(db, user.id, workspaceId);

  // Upcoming appointments
  const upcoming = await db
    .select({
      id: appointments.id,
      title: appointments.title,
      notes: appointments.notes,
      attendeeName: appointments.attendeeName,
      attendeeEmail: appointments.attendeeEmail,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      userId: appointments.userId,
      userName: users.name,
    })
    .from(appointments)
    .leftJoin(users, eq(users.id, appointments.userId))
    .where(
      and(
        eq(appointments.workspaceId, workspaceId),
        eq(appointments.status, "scheduled"),
        gte(appointments.startTime, new Date())
      )
    )
    .orderBy(appointments.startTime)
    .limit(20);

  // Availability rules
  const rules = await db
    .select({
      id: availabilityRules.id,
      dayOfWeek: availabilityRules.dayOfWeek,
      startTime: availabilityRules.startTime,
      endTime: availabilityRules.endTime,
      timezone: availabilityRules.timezone,
    })
    .from(availabilityRules)
    .where(eq(availabilityRules.workspaceId, workspaceId))
    .orderBy(availabilityRules.dayOfWeek);

  const dayNames = lang === "en"
    ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    : ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  const dayShortNames = lang === "en"
    ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    : ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  function formatTime(d: string | Date): string {
    return new Date(d).toLocaleTimeString("id-ID", {
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
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={Calendar}
        title={t("Booking Appointment", "Booking Appointment")}
        description={t(
          "Kelola jadwal janji temu klien, ketersediaan jam kerja, dan tautan booking publik.",
          "Manage client booking schedule, working availability hours, and public booking link.",
        )}
        actions={
          ws.bookingSlug ? (
            <Button size="sm" className="h-8 gap-1.5 text-xs" asChild>
              <Link href={`/booking/${ws.bookingSlug}`} target="_blank">
                <Calendar className="h-3.5 w-3.5" />
                <span>{t("Booking Page", "Booking Page")}</span>
              </Link>
            </Button>
          ) : null
        }
      />

      {/* 3 Top Cards: Active Bookings, Weekly Availability, and Inline Booking Slug Form */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 items-stretch">
        <Card className="rounded-xl border shadow-none bg-card flex flex-col justify-between">
          <CardContent className="p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t("Janji Temu Aktif", "Active Bookings")}
              </p>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-foreground">
                {upcoming.length} <span className="text-xs font-normal text-muted-foreground">{t("terjadwal", "scheduled")}</span>
              </p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
              <Video className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-none bg-card flex flex-col justify-between">
          <CardContent className="p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t("Ketersediaan Kerja", "Weekly Availability")}
              </p>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-foreground">
                {rules.length} <span className="text-xs font-normal text-muted-foreground">{t("hari aktif / minggu", "active days / wk")}</span>
              </p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <BookingSlugForm defaultSlug={ws.bookingSlug} canEdit={ws.ownerId === user.id} compact />
      </div>

      {/* Main Content Layout: Availability Rules (Left 1/3) & Upcoming Appointments (Right 2/3) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Availability Rules */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="rounded-xl border shadow-none bg-card">
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3 border-b">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  {t("Aturan Ketersediaan", "Availability Rules")}
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {rules.length} {t("slot jam kerja aktif", "active work hour slots")}
                </p>
              </div>
              <AvailabilityRuleForm />
            </CardHeader>
            <CardContent className="p-3.5 space-y-2">
              {rules.length === 0 && (
                <EmptyState
                  icon={Clock}
                  title={t("Belum ada aturan ketersediaan", "No availability rules yet")}
                  description={t("Tambah aturan untuk menentukan kapan kamu tersedia menerima booking", "Add rules to define when you're available for bookings")}
                />
              )}
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between gap-2.5 rounded-lg border border-border/80 bg-muted/20 p-2.5 transition-all hover:bg-muted/40 hover:border-primary/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-7 w-10 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-xs uppercase shrink-0">
                      {dayShortNames[rule.dayOfWeek]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground leading-tight">
                        {dayNames[rule.dayOfWeek]}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                        {rule.startTime.substring(0, 5)} – {rule.endTime.substring(0, 5)}
                      </p>
                    </div>
                  </div>
                  <DeleteAvailabilityRuleButton
                    id={rule.id}
                    label={`${dayNames[rule.dayOfWeek]} ${rule.startTime.substring(0, 5)}–${rule.endTime.substring(0, 5)}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments */}
        <Card className="flex h-full flex-col lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                {t("Janji Temu Mendatang", "Upcoming Appointments")}
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t("Daftar booking terjadwal yang siap dihadiri.", "Scheduled bookings ready for meeting.")}
              </p>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {upcoming.length} {t("terjadwal", "scheduled")}
            </span>
          </CardHeader>
          <CardContent className="flex-1 p-3.5">
            {upcoming.length === 0 ? (
              <div className="flex h-64 items-center justify-center">
                <EmptyState
                  icon={CalendarDays}
                  title={t("Belum ada janji temu mendatang", "No upcoming appointments")}
                  description={t("Bagikan link booking kamu agar klien bisa menjadwalkan sesi secara mandiri", "Share your booking link so clients can schedule themselves")}
                />
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {upcoming.map((item) => {
                  const dateInfo = parseDateBadge(item.startTime);
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
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {item.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                              {formatTime(item.startTime)} – {formatTime(item.endTime)}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="h-1 w-1 rounded-full bg-border" />
                              <span className="font-medium text-foreground">{item.attendeeName}</span>
                              <span className="text-muted-foreground">({item.attendeeEmail})</span>
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
                        <AppointmentActions id={item.id} title={item.title || "Sesi Diskusi"} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
