import { db } from "@/db";
import Image from "next/image";
import { availabilityRules, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getAvailableSlots } from "@/lib/actions/appointments";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, ShieldCheck, Sparkles } from "lucide-react";
import { createT, getCurrentLang } from "@/lib/i18n";
import { PublicBookingForm } from "@/components/calendar/public-booking-form";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; success?: string }>;
}

export default async function PublicBookingPage({ params, searchParams }: Props) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const { slug } = await params;
  const sp = await searchParams;

  const [ws] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      bookingSlug: workspaces.bookingSlug,
      logoUrl: workspaces.logoUrl,
    })
    .from(workspaces)
    .where(eq(workspaces.bookingSlug, slug))
    .limit(1);

  if (!ws) notFound();

  const [firstRule] = await db
    .select({ timezone: availabilityRules.timezone })
    .from(availabilityRules)
    .where(eq(availabilityRules.workspaceId, ws.id))
    .limit(1);
  const timezone = firstRule?.timezone || "Asia/Jakarta";

  const selectedDate = sp.date || new Date().toISOString().split("T")[0];

  // Pre-load available slots for the initial date
  let slots: { start: string; end: string }[] = [];
  let slotsError = "";
  try {
    slots = await getAvailableSlots(ws.id, selectedDate);
  } catch (err) {
    slotsError = err instanceof Error ? err.message : "Failed to load slots";
  }

  const success = sp.success === "1";

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col justify-between py-8 px-4 sm:px-6">
      {/* Background ambient gradient glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center opacity-30 dark:opacity-20 overflow-hidden">
        <div className="h-[40rem] w-[40rem] rounded-full bg-gradient-to-tr from-primary/30 to-violet-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-xl">
        {/* Header Branding Card */}
        <div className="mb-6 rounded-2xl border border-border/80 bg-card p-6 shadow-xs text-center backdrop-blur-xs">
          <div className="relative mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white shadow-md shadow-primary/20">
            {ws.logoUrl ? (
              <Image
                src={ws.logoUrl}
                alt={ws.name}
                fill
                sizes="56px"
                className="rounded-2xl object-cover"
              />
            ) : (
              <span className="text-xl font-bold tracking-tight">{ws.name.charAt(0).toUpperCase()}</span>
            )}
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card text-white">
              <Sparkles className="h-2.5 w-2.5" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">{ws.name}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t("Jadwalkan sesi konsultasi atau pertemuan langsung", "Book a consultation or direct meeting with us")}
          </p>
        </div>

        {success ? (
          <div className="rounded-2xl border border-border/80 bg-card p-8 text-center shadow-xs">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {t("Janji Temu Berhasil Dijadwalkan!", "Booking Confirmed!")}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              {t(
                "Jadwal janji temu Anda telah tercatat. Kami akan mengirimkan detail konfirmasi ke email Anda.",
                "Your appointment has been scheduled. You'll receive a confirmation email shortly.",
              )}
            </p>
            <Button className="mt-6 rounded-xl font-semibold" asChild>
              <a href={`/booking/${slug}`}>
                <Calendar className="mr-2 h-4 w-4" />
                {t("Jadwalkan Sesi Lain", "Book Another Session")}
              </a>
            </Button>
          </div>
        ) : (
          <PublicBookingForm
            workspace={ws}
            timezone={timezone}
            initialDate={selectedDate}
            initialSlots={slots}
            initialError={slotsError}
            lang={lang}
          />
        )}
      </div>

      {/* Footer Branding */}
      <footer className="relative mt-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        <span>{t("Didukung oleh", "Powered by")} <strong className="text-foreground font-semibold">Cubiqlo</strong> · Client Operations Hub</span>
      </footer>
    </div>
  );
}
