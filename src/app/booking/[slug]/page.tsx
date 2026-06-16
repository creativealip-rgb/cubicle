import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { createPublicAppointment, getAvailableSlots } from "@/lib/actions/appointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Clock, User, Mail, FileText, CheckCircle2 } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; success?: string }>;
}

export default async function PublicBookingPage({ params, searchParams }: Props) {
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

  const selectedDate = sp.date || new Date().toISOString().split("T")[0];

  // Pre-load available slots for the selected date
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
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ws.logoUrl}
              alt={ws.name}
              className="mx-auto mb-4 h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-lg font-bold">{ws.name.charAt(0)}</span>
            </div>
          )}
          <h1 className="text-2xl font-semibold">{ws.name}</h1>
          <p className="text-sm text-muted-foreground">Book a time with us</p>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                <CalendarIcon className="mr-2 inline h-5 w-5" />
                Schedule Appointment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                action={async (formData: FormData) => {
                  "use server";
                  const title = formData.get("title") as string;
                  const notes = formData.get("notes") as string;
                  const attendeeName = formData.get("attendeeName") as string;
                  const attendeeEmail = formData.get("attendeeEmail") as string;
                  const slot = formData.get("slot") as string;

                  if (!title || !attendeeName || !attendeeEmail || !slot) {
                    throw new Error("All required fields must be filled");
                  }

                  const [startTime, endTime] = slot.split("|");
                  if (!startTime || !endTime) throw new Error("Invalid slot");

                  await createPublicAppointment({
                    workspaceId: ws.id,
                    title,
                    notes: notes || undefined,
                    attendeeName,
                    attendeeEmail,
                    startTime,
                    endTime,
                  });

                  redirect(`/booking/${slug}?success=1`);
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="title">
                    <FileText className="mr-1 inline h-4 w-4" />
                    Title
                  </Label>
                  <Input id="title" name="title" placeholder="e.g. Project Consultation" required />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="attendeeName">
                      <User className="mr-1 inline h-4 w-4" />
                      Your Name
                    </Label>
                    <Input id="attendeeName" name="attendeeName" placeholder="Your full name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="attendeeEmail">
                      <Mail className="mr-1 inline h-4 w-4" />
                      Your Email
                    </Label>
                    <Input
                      id="attendeeEmail"
                      name="attendeeEmail"
                      type="email"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                {/* Date picker — simple form GET to same page */}
                <div className="space-y-2">
                  <Label>
                    <CalendarIcon className="mr-1 inline h-4 w-4" />
                    Date
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      name="date"
                      defaultValue={selectedDate}
                      className="flex-1"
                      form="dateForm"
                    />
                    <Button type="submit" variant="outline" size="sm" form="dateForm">
                      Change
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    <Clock className="mr-1 inline h-4 w-4" />
                    Available Times
                  </Label>
                  {slotsError ? (
                    <p className="text-sm text-destructive">{slotsError}</p>
                  ) : slots.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center">
                      <CalendarIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">No available slots for this date</p>
                      <p className="text-xs text-muted-foreground">Try selecting a different date</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((slot, i) => (
                        <label
                          key={i}
                          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border p-3 text-center hover:border-primary hover:bg-primary/5 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                        >
                          <input
                            type="radio"
                            name="slot"
                            value={`${slot.start}|${slot.end}`}
                            className="sr-only"
                            required
                          />
                          <span className="text-sm font-medium">
                            {new Date(slot.start).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-[10px] text-muted-foreground">30 min</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">
                    <FileText className="mr-1 inline h-4 w-4" />
                    Notes (optional)
                  </Label>
                  <Textarea id="notes" name="notes" placeholder="Any additional information..." rows={3} />
                </div>

                <Button type="submit" className="w-full">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Book Appointment
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Hidden form for date change — GET request to reload with new date */}
      <form id="dateForm" method="GET" className="hidden" />
    </div>
  );
}
