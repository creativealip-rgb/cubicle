import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/access";
import { disconnectGoogleCalendar } from "@/lib/google-calendar";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await disconnectGoogleCalendar(user.id);
  revalidatePath("/app/settings");
  revalidatePath("/app/calendar");
  return NextResponse.json({ ok: true });
}
