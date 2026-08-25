import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/same-origin";

const langs = ["id", "en"] as const;
const currencies = ["IDR", "USD"] as const;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
    }
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
    const { lang, currency } = body as Record<string, unknown>;
    if ((lang === undefined && currency === undefined)
      || (lang !== undefined && !langs.includes(lang as typeof langs[number]))
      || (currency !== undefined && !currencies.includes(currency as typeof currencies[number]))) {
      return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
    }
    const response = NextResponse.json({ ok: true });
    const options = { httpOnly: false, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 31536000 };
    if (lang !== undefined) response.cookies.set("cubiqlo_lang", lang as string, options);
    if (currency !== undefined) response.cookies.set("cubiqlo_currency", currency as string, options);
    if (lang !== undefined) {
      const session = await auth.api.getSession({ headers: await headers() });
      if (session?.user?.id) await db.update(users).set({ preferredLanguage: lang as "id" | "en" }).where(eq(users.id, session.user.id));
    }
    return response;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const __preferences = { langs, currencies };
