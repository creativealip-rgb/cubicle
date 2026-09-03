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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Calendar, CalendarDays, Clock, User, Link as LinkIcon, CheckCircle2, Video } from "lucide-react";
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
    return new Date(d).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
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
        title={t("Kalender & Janji Temu", "Calendar & Appointments")}
        description={t(
          "Kelola janji temu klien, ketersediaan jadwal mingguan, dan integrasi link booking publik.",
          "Manage client appointments, weekly availability rules, and public booking link.",
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

      {/* 3-KPI Overview Cards Banner */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="rounded-xl border shadow-none bg-card">
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

        <Card className="rounded-xl border shadow-none bg-card">
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

        <Card className="rounded-xl border shadow-none bg-card">
          <CardContent className="p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t("Status Halaman Booking", "Public Booking Link")}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-foreground">
                  {ws.bookingSlug ? `/${ws.bookingSlug}` : t("Belum Diatur", "Disabled")}
                </span>
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <LinkIcon className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <BookingSlugForm defaultSlug={ws.bookingSlug} canEdit={ws.ownerId === user.id} />

          {/* Availability Rules Card */}
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

        {/* Upcoming Appointments Card */}
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
            <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
              {upcoming.length} {t("terjadwal", "scheduled")}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-3">
            {upcoming.length === 0 && (
              <div className="flex min-h-[20rem] flex-1 items-center justify-center py-8 text-center">
                <EmptyState
                  icon={CalendarDays}
                  title={t("Belum ada jadwal mendatang", "No upcoming appointments")}
                  description={t("Bagikan link booking supaya klien bisa atur jadwal sendiri", "Share your booking link so clients can schedule themselves")}
                />
              </div>
            )}
            {upcoming.map((apt) => {
              const dateBadge = parseDateBadge(apt.startTime);
              return (
                <div
                  key={apt.id}
                  className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Date Badge Mini Box */}
                      <div className="flex flex-col items-center justify-center rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-center shrink-0 w-12">
                        <span className="text-[10px] font-bold text-primary tracking-wider uppercase leading-none">
                          {dateBadge.month}
                        </span>
                        <span className="text-base font-extrabold text-foreground leading-tight mt-0.5">
                          {dateBadge.day}
                        </span>
                        <span className="text-[9px] font-medium text-muted-foreground uppercase leading-none">
                          {dateBadge.weekday}
                        </span>
                      </div>

                      {/* Detail Janji Temu */}
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-bold text-foreground tracking-tight leading-tight">
                          {apt.title}
                        </p>
                        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                          <Clock className="h-3 w-3 shrink-0" aria-hidden />
                          {formatTime(apt.startTime)} – {formatTime(apt.endTime)}
                        </p>
                        {apt.attendeeName && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3 inline shrink-0" aria-hidden />
                            <span className="font-medium text-foreground">{apt.attendeeName}</span>
                            {apt.attendeeEmail && <span className="text-[11px] text-muted-foreground truncate">({apt.attendeeEmail})</span>}
                          </p>
                        )}
                        {apt.notes && (
                          <p className="rounded-md bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground line-clamp-2 mt-1">
                            {apt.notes}
                          </p>
                        )}
                        {apt.userName && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {t("Ditugaskan ke", "Assigned to")}: <span className="font-medium text-foreground">{apt.userName}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions & Status Badge */}
                    <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 self-end sm:self-start">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {t("Terjadwal", "Scheduled")}
                      </Badge>
                      <AppointmentActions id={apt.id} title={apt.title} />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
