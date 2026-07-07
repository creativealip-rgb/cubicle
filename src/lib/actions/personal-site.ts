"use server";

import { db } from "@/db";
import { personalNotes } from "@/db/schema";
import { eq } from "drizzle-orm";

const KEY = "[site]";

/**
 * Check if a slug is already taken by another user's published landing page.
 * Returns true if slug is available, false if taken.
 */
export async function checkSlugUnique(slug: string): Promise<boolean> {
  if (!slug || slug.length < 2) return false;

  const rows = await db
    .select({ body: personalNotes.body })
    .from(personalNotes)
    .where(eq(personalNotes.title, KEY))
    .limit(500);

  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.body || "{}");
      if (parsed.published && parsed.slug === slug) return false;
    } catch {
      // skip malformed
    }
  }
  return true;
}
