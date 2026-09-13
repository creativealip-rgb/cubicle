import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { uploadIntents } from "@/db/schema";
import { R2_CONFIGURED } from "@/lib/r2";
import { cleanupUploadIntent } from "@/lib/upload-cleanup-worker";

async function main() {
  const apply = process.argv.includes("--apply");
  if (apply && process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_UPLOAD_CLEANUP !== "1") throw new Error("Refusing production cleanup without ALLOW_PRODUCTION_UPLOAD_CLEANUP=1");
  if (!R2_CONFIGURED) throw new Error("R2 storage is not configured");
  const now = new Date();
  const candidates = await db.select({ id: uploadIntents.id }).from(uploadIntents).where(and(eq(uploadIntents.state, "failed_cleanup"), lte(uploadIntents.cleanupRetryAt, now))).limit(100);
  let cleaned = 0;
  if (apply) for (const candidate of candidates) if (await cleanupUploadIntent(candidate.id, now)) cleaned += 1;
  console.log(JSON.stringify({ dryRun: !apply, candidates: candidates.length, cleaned, limit: 100 }));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
