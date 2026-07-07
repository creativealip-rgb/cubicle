import { NextResponse } from "next/server";
import { db } from "@/db";
import { personalNotes, users, workspaceMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    const now = new Date();
    const results: { noteId: string; title: string; daysUntil: number; emailed: boolean }[] = [];

    // Check each reminder window: 7d, 3d, 1d
    for (const [days, field] of [
      [7, "notify7d"],
      [3, "notify3d"],
      [1, "notify1d"],
    ] as const) {
      const windowStart = new Date(now.getTime() + (days - 1) * 24 * 3600 * 1000);
      const windowEnd = new Date(now.getTime() + days * 24 * 3600 * 1000);

      const notes = await db
        .select({
          id: personalNotes.id,
          title: personalNotes.title,
          dueDate: personalNotes.dueDate,
          userId: personalNotes.userId,
          workspaceId: personalNotes.workspaceId,
        })
        .from(personalNotes)
        .where(
          and(
            eq(personalNotes.status, "open"),
            eq(personalNotes[field], true),
            sql`${personalNotes.dueDate} IS NOT NULL`,
            sql`${personalNotes.dueDate} >= ${windowStart.toISOString()}`,
            sql`${personalNotes.dueDate} < ${windowEnd.toISOString()}`,
          ),
        )
        .limit(100);

      for (const note of notes) {
        // Get owner email
        const [owner] = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, note.userId))
          .limit(1);

        if (!owner?.email) {
          results.push({ noteId: note.id, title: note.title, daysUntil: days, emailed: false });
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
          `Segera selesaikan atau perpanjang reminder ini di Cubiqlo.`;

        const emailed = await sendNotification({
          to: owner.email,
          subject: `[Cubiqlo] Reminder: ${note.title} — ${days} hari lagi`,
          text,
          type: "personal_note_reminder",
        });

        results.push({ noteId: note.id, title: note.title, daysUntil: days, emailed: emailed.success });
      }
    }

    return NextResponse.json({ ok: true, sent: results.length, results });
  } catch (err) {
    console.error("[cron/personal-note-reminders] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
