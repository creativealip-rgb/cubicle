import { NextResponse } from "next/server";
import { getExpiringUsers } from "@/lib/subscription";
import { verifyCronRequest } from "@/lib/cron-auth";
import { sendNotification } from "@/lib/notifications";

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const expiring = await getExpiringUsers();

    const results = await Promise.all(expiring.map(async (user) => {
      const result = await sendNotification({
        to: user.email,
        subject: `Cubiqlo ${user.plan.toUpperCase()} expires in ${user.daysUntilExpiry} day${user.daysUntilExpiry === 1 ? "" : "s"}`,
        text: `Hi ${user.name || "there"},\n\nYour Cubiqlo ${user.plan.toUpperCase()} plan expires on ${user.planExpiresAt.toISOString().slice(0, 10)}. Renew from Settings → Billing to keep your workspace active.`,
        type: `plan-expiry-${user.daysUntilExpiry}d`,
      });
      return result.success;
    }));
    const sent = results.filter(Boolean).length;

    return NextResponse.json({ ok: true, reminders: expiring.length, sent, failed: expiring.length - sent });
  } catch (err) {
    console.error("[cron/plan-reminders] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}