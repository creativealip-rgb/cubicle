import { NextResponse } from "next/server";
import { getExpiringUsers } from "@/lib/subscription";

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
    const expiring = await getExpiringUsers();

    for (const user of expiring) {
      // TODO: send email via Resend when production-ready
      console.log(
        `[cron/plan-reminders] user "${user.name}" (${user.id}) — plan ${user.plan} expires in ${user.daysUntilExpiry} day(s)`,
      );
    }

    return NextResponse.json({ ok: true, reminders: expiring.length, users: expiring });
  } catch (err) {
    console.error("[cron/plan-reminders] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
