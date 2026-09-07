"use server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/access";
import { db } from "@/db";
import { personalDailyQuotes, users } from "@/db/schema";
import { chat } from "@/lib/ai/client";
import { fallbackQuote, localDateInTimezone, parseDailyQuote } from "@/lib/daily-quote";

export async function getDailyQuote(lang: "id" | "en") {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const [profile] = await db.select({ timezone: users.timezone }).from(users).where(eq(users.id, user.id)).limit(1);
  const localDate = localDateInTimezone(new Date(), profile?.timezone || "Asia/Jakarta");
  const where = and(eq(personalDailyQuotes.userId, user.id), eq(personalDailyQuotes.localDate, localDate));
  const [existing] = await db.select().from(personalDailyQuotes).where(where).limit(1);
  if (existing) return existing;

  let source: "ai" | "fallback" = "fallback";
  let selected = fallbackQuote(lang, localDate);
  try {
    const result = await Promise.race([
      chat([
        { role: "system", content: "Return one short, original, safe reflection quote as plain text. Optional attribution format: quote — author. No markdown, HTML, personal data, or newline." },
        { role: "user", content: lang === "id" ? "Tulis dalam Bahasa Indonesia." : "Write in English." },
      ], { maxTokens: 80, temperature: 0.9 }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI timeout")), 4000)),
    ]);
    selected = parseDailyQuote(result.message.content);
    source = "ai";
  } catch {
    // Stable local fallback keeps Journal usable when provider is unavailable.
  }

  await db.insert(personalDailyQuotes).values({ userId: user.id, localDate, ...selected, source }).onConflictDoNothing();
  const [winner] = await db.select().from(personalDailyQuotes).where(where).limit(1);
  if (!winner) throw new Error("Quote hari ini belum tersedia");
  return winner;
}
