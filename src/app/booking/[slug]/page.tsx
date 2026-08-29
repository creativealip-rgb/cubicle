import { db } from "@/db";
import Image from "next/image";
import { availabilityRules, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getAvailableSlots } from "@/lib/actions/appointments";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
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
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Branding */}
        <div className="mb-8 text-center">
          {ws.logoUrl ? (
            <div className="relative mx-auto mb-4 h-12 w-12 rounded-lg overflow-hidden shrink-0">
              <Image
                src={ws.logoUrl}
                alt={ws.name}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-lg font-bold">{ws.name.charAt(0)}</span>
            </div>
          )}
          <h1 className="text-2xl font-semibold">{ws.name}</h1>
          <p className="text-sm text-foreground/70">{t("Pesan waktu bersama kami", "Book a time with us")}</p>
        </div>

        {success ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
              <h2 className="text-xl font-semibold">Booking Confirmed!</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Your appointment has been scheduled. You&apos;ll receive a confirmation shortly.
              </p>
              <Button variant="outline" className="mt-6" asChild>
                <a href={`/booking/${slug}`}>Book Another</a>
              </Button>
            </CardContent>
          </Card>
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
    </div>
  );
}
