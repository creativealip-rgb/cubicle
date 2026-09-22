import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  appointments,
  availabilityRules,
  users,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Calendar, Clock, Video, CalendarCheck } from "lucide-react";
import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { AvailabilityRuleForm } from "@/components/calendar/availability-rule-form";
import { BookingSlugHeaderWidget } from "@/components/calendar/booking-slug-header-widget";
import { AppointmentsListPanel } from "@/components/calendar/appointments-list-panel";
import { DeleteAvailabilityRuleButton } from "@/components/calendar/calendar-item-actions";
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

  // All appointments for this workspace
  const allAppointments = await db
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
    .where(eq(appointments.workspaceId, workspaceId))
    .orderBy(desc(appointments.startTime))
    .limit(50);

  const now = new Date();
  const scheduledUpcoming = allAppointments.filter(
    (item) => item.status === "scheduled" && new Date(item.startTime) >= now
  );

  // Sort upcoming chronologically for next session calculation
  const nextSession = scheduledUpcoming.length
    ? [...scheduledUpcoming].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )[0]
    : null;

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

  function formatShortDate(d: Date | string) {
    return new Date(d).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={Calendar}
        title={t("Booking Appointment", "Booking Appointment")}
        description={t(
          "Kelola jadwal janji temu klien, ketersediaan jam kerja, dan tautan booking publik.",
          "Manage client booking schedule, working availability hours, and public booking link."
        )}
        actions={
          <BookingSlugHeaderWidget
            defaultSlug={ws.bookingSlug}
            defaultPlatform={ws.bookingMeetingPlatform ?? "google_meet"}
            defaultLink={ws.bookingMeetingLink ?? ""}
            canEdit={ws.ownerId === user.id}
          />
        }
      />

      {/* 3 Unified KPI Metrik Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="rounded-xl border shadow-none bg-card">
          <CardContent className="p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t("Janji Temu Aktif", "Active Bookings")}
              </p>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-foreground">
                {scheduledUpcoming.length}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  {t("sesi terjadwal", "scheduled sessions")}
                </span>
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
                {t("Ketersediaan Jam Kerja", "Weekly Availability")}
              </p>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-foreground">
                {rules.length}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  {t("hari aktif / mgg", "active days / wk")}
                </span>
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
                {t("Sesi Terdekat", "Next Session")}
              </p>
              <p className="mt-0.5 text-sm font-bold tracking-tight text-foreground truncate">
                {nextSession ? (
                  `${nextSession.attendeeName || t("Klien", "Client")} · ${formatShortDate(nextSession.startTime)}`
                ) : (
                  <span className="text-xs font-normal text-muted-foreground">
                    {t("Tidak ada sesi hari ini", "No upcoming session")}
                  </span>
                )}
              </p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2-Column Main Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-stretch">
        {/* Availability Rules */}
        <div className="flex flex-col lg:col-span-1">
          <Card className="rounded-xl border shadow-none bg-card flex flex-col h-full">
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
            <CardContent className="p-3.5 space-y-2 flex-1 flex flex-col">
              {rules.length === 0 && (
                <div className="flex flex-1 items-center justify-center">
                  <EmptyState
                    icon={Clock}
                    title={t("Belum ada aturan ketersediaan", "No availability rules yet")}
                    description={t(
                      "Tambah aturan untuk menentukan kapan kamu tersedia menerima booking",
                      "Add rules to define when you're available for bookings"
                    )}
                    embedded
                  />
                </div>
              )}
            <div className="divide-y divide-border/60 -mx-3.5 px-3.5">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between gap-2.5 py-2.5 first:pt-0 last:pb-0"
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
            </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointments List Panel with Status Tabs */}
        <Card className="flex h-full flex-col lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                {t("Jadwal Janji Temu", "Appointments Schedule")}
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t(
                  "Daftar pertemuan klien terjadwal, sesi selesai, dan pembatalan.",
                  "Client scheduled meetings, completed sessions, and cancellations."
                )}
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-3.5">
            <AppointmentsListPanel appointments={allAppointments} locale={locale} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
