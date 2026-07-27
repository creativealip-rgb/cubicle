import { z } from "zod";

export const MEETING_DURATIONS = [30, 45, 60, 90, 120] as const;
export type MeetingStatus = "requested" | "counter_proposed" | "approved" | "rejected";

export const meetingScheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.number().refine((value) => MEETING_DURATIONS.includes(value as (typeof MEETING_DURATIONS)[number]), "Durasi tidak valid"),
  timezone: z.string().min(1),
});

function formatter(timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    throw new Error("Zona waktu tidak valid");
  }
}

function partsAt(date: Date, timezone: string) {
  const values = Object.fromEntries(
    formatter(timezone)
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return values as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
}

function localDateTimeToUtc(date: string, time: string, timezone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desiredUtcShape = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = new Date(desiredUtcShape);

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const actual = partsAt(candidate, timezone);
    const actualUtcShape = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    candidate = new Date(candidate.getTime() + desiredUtcShape - actualUtcShape);
  }

  const roundTrip = partsAt(candidate, timezone);
  if (
    roundTrip.year !== year || roundTrip.month !== month || roundTrip.day !== day ||
    roundTrip.hour !== hour || roundTrip.minute !== minute
  ) {
    throw new Error("Waktu lokal tidak valid pada zona waktu tersebut");
  }
  return candidate;
}

export function buildMeetingSchedule(input: z.input<typeof meetingScheduleSchema>, now = new Date()) {
  const parsed = meetingScheduleSchema.parse(input);
  formatter(parsed.timezone);
  const start = localDateTimeToUtc(parsed.date, parsed.time, parsed.timezone);
  if (start <= now) throw new Error("Jadwal harus di masa depan");
  const end = new Date(start.getTime() + parsed.durationMinutes * 60_000);
  return { ...parsed, start, end };
}

export function intervalsOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

const transitions: Record<MeetingStatus, readonly MeetingStatus[]> = {
  requested: ["approved", "rejected", "counter_proposed"],
  counter_proposed: ["approved", "requested", "rejected"],
  approved: [],
  rejected: [],
};

export function canTransitionMeeting(from: MeetingStatus, to: MeetingStatus) {
  return transitions[from].includes(to);
}
