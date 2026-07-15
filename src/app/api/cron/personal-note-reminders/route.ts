import { NextResponse } from "next/server";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { personalNotes, users } from "@/db/schema";
import { sendNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Don't re-send same window within this period (covers hourly cron + clock skew). */
const DEDUPE_MS = 20 * 60 * 60 * 1000; // 20 hours

type WindowField = "notify7d" | "notify3d" | "notify1d";
type RemindedField = "lastReminded7d" | "lastReminded3d" | "lastReminded1d";

const WINDOWS: { days: number; notify: WindowField; reminded: RemindedField }[] = [
  { days: 7, notify: "notify7d", reminded: "lastReminded7d" },
  { days: 3, notify: "notify3d", reminded: "lastReminded3d" },
  { days: 1, notify: "notify1d", reminded: "lastReminded1d" },
];

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Cron secret is not configured" }, { status: 503 });
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First: roll open recurring notes whose due date already passed
    const { rollOverdueRecurringNotes } = await import(
      "@/lib/actions/personal-notes"
    );
    const rolled = await rollOverdueRecurringNotes(200);

    const now = new Date();
    const dedupeBefore = new Date(now.getTime() - DEDUPE_MS);
    const results: {
      noteId: string;
      title: string;
      daysUntil: number;
      emailed: boolean;
      skipped?: string;
    }[] = [];

    for (const { days, notify, reminded } of WINDOWS) {
      // Window: dueDate in [now + (days-1)d, now + days d)
      const windowStart = new Date(now.getTime() + (days - 1) * 24 * 3600 * 1000);
      const windowEnd = new Date(now.getTime() + days * 24 * 3600 * 1000);

      const notes = await db
        .select({
          id: personalNotes.id,
          title: personalNotes.title,
          dueDate: personalNotes.dueDate,
          userId: personalNotes.userId,
          lastReminded7d: personalNotes.lastReminded7d,
          lastReminded3d: personalNotes.lastReminded3d,
          lastReminded1d: personalNotes.lastReminded1d,
        })
        .from(personalNotes)
        .where(
          and(
            eq(personalNotes.status, "open"),
            eq(personalNotes[notify], true),
            sql`${personalNotes.dueDate} IS NOT NULL`,
            sql`${personalNotes.dueDate} >= ${windowStart.toISOString()}`,
            sql`${personalNotes.dueDate} < ${windowEnd.toISOString()}`,
            // hide system notes
            sql`${personalNotes.title} NOT LIKE ${"[journal]%"}`,
            sql`${personalNotes.title} NOT LIKE ${"[site]%"}`,
            // dedupe: never reminded OR last reminded older than 20h
            or(
              isNull(personalNotes[reminded]),
              sql`${personalNotes[reminded]} < ${dedupeBefore.toISOString()}`,
            ),
          ),
        )
        .limit(100);

      for (const note of notes) {
        const [owner] = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, note.userId))
          .limit(1);

        if (!owner?.email) {
          results.push({
            noteId: note.id,
            title: note.title,
            daysUntil: days,
            emailed: false,
            skipped: "no-email",
          });
          continue;
        }

        const dueDateStr = note.dueDate
          ? new Date(note.dueDate).toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "unknown";

        const text =
          `Hi ${owner.name},\n\n` +
          `Reminder: "${note.title}" akan jatuh tempo dalam ${days} hari (${dueDateStr}).\n\n` +
          `Kelola catatan di Cubiqlo → Catatan.`;

        const emailed = await sendNotification({
          to: owner.email,
          subject: `[Cubiqlo] Reminder: ${note.title} — ${days} hari lagi`,
          text,
          type: "personal_note_reminder",
        });

        if (emailed.success) {
          await db
            .update(personalNotes)
            .set({ [reminded]: now, updatedAt: now })
            .where(eq(personalNotes.id, note.id));
        }

        results.push({
          noteId: note.id,
          title: note.title,
          daysUntil: days,
          emailed: Boolean(emailed.success),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      rolled,
      sent: results.filter((r) => r.emailed).length,
      total: results.length,
      results,
    });
  } catch (err) {
    console.error("[cron/personal-note-reminders] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
