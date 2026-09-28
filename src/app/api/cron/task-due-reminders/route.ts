import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, users, projects } from "@/db/schema";
import { eq, and, sql, not, isNotNull } from "drizzle-orm";
import { notifyTaskDueReminder } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // 1. Ambil task yang memiliki due_date, belum selesai (bukan 'done'), dan memiliki assignee
  const activeTasksWithDue = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      status: tasks.status,
      assigneeId: tasks.assigneeId,
      assigneeName: users.name,
      assigneeEmail: users.email,
      projectName: projects.name,
    })
    .from(tasks)
    .innerJoin(users, eq(users.id, tasks.assigneeId))
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .where(
      and(
        isNotNull(tasks.dueDate),
        isNotNull(tasks.assigneeId),
        not(eq(tasks.status, "done"))
      )
    );

  let notifiedCount = 0;

  for (const t of activeTasksWithDue) {
    if (!t.dueDate || !t.assigneeEmail) continue;

    const taskDueDate = new Date(t.dueDate);
    // Hitung selisih hari
    const diffTime = taskDueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Kirim notifikasi jika Due Hari Ini (0) atau Besok (1)
    if (diffDays === 0 || diffDays === 1) {
      try {
        await notifyTaskDueReminder({
          assigneeEmail: t.assigneeEmail,
          assigneeName: t.assigneeName || t.assigneeEmail,
          taskTitle: t.title,
          taskId: t.id,
          dueDate: t.dueDate.split("T")[0],
          daysRemaining: diffDays,
          projectName: t.projectName,
        });
        notifiedCount++;
      } catch (err) {
        console.error(`[CRON-TASK-REMINDER-ERROR] Task ${t.id}:`, err);
      }
    }
  }

  return NextResponse.json({
    success: true,
    checked: activeTasksWithDue.length,
    notified: notifiedCount,
  });
}
