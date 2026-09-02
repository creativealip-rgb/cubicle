import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Pool } from "pg";
import { R2_BUCKET, R2_CONFIGURED, r2 } from "@/lib/r2";

type Job = { id: string; storage_key: string; attempts: number };

async function main() {
  if (!R2_CONFIGURED) throw new Error("R2 storage is not configured");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let failed = 0;
  try {
    const { rows } = await pool.query<Job>(
      "select id,storage_key,attempts from personal_receipt_cleanup_queue where next_attempt_at<=now() order by next_attempt_at,id for update skip locked limit 100",
    );
    for (const job of rows) {
      try {
        await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: job.storage_key }));
        await pool.query("delete from personal_receipt_cleanup_queue where id=$1", [job.id]);
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message.slice(0, 1000) : "Object cleanup failed";
        const delayMinutes = Math.min(1440, 2 ** Math.min(job.attempts, 10));
        await pool.query(
          "update personal_receipt_cleanup_queue set attempts=attempts+1,last_error=$2,next_attempt_at=now()+($3||' minutes')::interval,updated_at=now() where id=$1",
          [job.id, message, String(delayMinutes)],
        );
      }
    }
    console.log(JSON.stringify({ processed: rows.length, failed }));
    if (failed) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
