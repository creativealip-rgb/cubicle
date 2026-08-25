import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sendNotification } from "@/lib/notifications";
import { getPublishedPersonalSiteBySlug } from "@/lib/actions/personal-site";
import { normalizePersonalSiteSlug } from "@/lib/personal-site/model";

// In-memory rate limiter: max 3 per hour per IP
const rateLimit = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const window = 60 * 60 * 1000; // 1 hour
  const timestamps = rateLimit.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < window);
  if (recent.length >= 3) return true;
  recent.push(now);
  rateLimit.set(ip, recent);
  return false;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const clean = normalizePersonalSiteSlug(slug);
  if (clean !== slug) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Rate limit
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  let body: { name?: string; email?: string; message?: string; phone?: string; _hp?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Honeypot — if _hp field is filled, it's a bot
  if (body._hp) {
    // Return success silently to not alert bots
    return NextResponse.json({ success: true });
  }

  // Validate required fields
  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const message = (body.message ?? "").trim();
  const phone = (body.phone ?? "").trim();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 });
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  // Find effective published site and owner
  const site = await getPublishedPersonalSiteBySlug(clean);
  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get owner email
  const [owner] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, site.userId))
    .limit(1);

  if (!owner?.email) {
    // Fallback: log and return success even if email fails
    console.error(`[CONTACT-FORM] No owner email for site ${clean}`);
    return NextResponse.json({ success: true });
  }

  // Send email notification
  const subject = `[${site.title}] Pesan dari ${name}`;
  const text = `Pesan baru dari landing page ${site.title}:\n\nNama: ${name}\nEmail: ${email}${phone ? `\nTelepon: ${phone}` : ""}\n\nPesan:\n${message}`;
  const html = `<h3>Pesan baru dari landing page <strong>${site.title}</strong></h3>
<p><strong>Nama:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
${phone ? `<p><strong>Telepon:</strong> ${phone}</p>` : ""}
<p><strong>Pesan:</strong></p>
<p style="white-space:pre-wrap">${message}</p>`;

  await sendNotification({
    to: owner.email,
    subject,
    text,
    html,
    replyTo: email,
    type: "contact-form",
  });

  return NextResponse.json({ success: true });
}
