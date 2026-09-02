import { createHash } from "node:crypto";
import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Pool } from "pg";
import { R2_BUCKET, R2_CONFIGURED, r2 } from "@/lib/r2";

type Receipt = { user_id: string; id: string; receipt_key: string; receipt_mime: string; receipt_size_bytes: string; receipt_checksum: string };
type Finding = { key: string; reason?: string };

async function main() {
  const prefix = process.env.PERSONAL_RECEIPT_RECONCILE_PREFIX?.trim();
  if (!prefix || !/^personal\/[^/]+\/receipts\/$/.test(prefix)) throw new Error("Authorized user-level PERSONAL_RECEIPT_RECONCILE_PREFIX is required");
  if (!R2_CONFIGURED) throw new Error("R2 storage is not configured");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query<Receipt>("select user_id,id,receipt_key,receipt_mime,receipt_size_bytes,receipt_checksum from personal_transactions where receipt_key is not null and receipt_key like $1", [`${prefix}%`]);
    const referenced = new Map(rows.map((row) => [row.receipt_key, row]));
    const objectKeys: string[] = [];
    let token: string | undefined;
    do {
      const page = await r2.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: prefix, ContinuationToken: token }));
      objectKeys.push(...(page.Contents ?? []).flatMap((item) => item.Key ? [item.Key] : []));
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);

    const missing_referenced_objects: Finding[] = [];
    const orphan_objects = objectKeys.filter((key) => !referenced.has(key)).map((key) => ({ key }));
    const invalid_canonical_keys: Finding[] = [];
    const metadata_or_size_mismatches: Finding[] = [];
    for (const row of rows) {
      const canonical = `personal/${row.user_id}/receipts/${row.id}/`;
      if (!row.receipt_key.startsWith(canonical)) invalid_canonical_keys.push({ key: row.receipt_key });
      try {
        const object = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: row.receipt_key }));
        if (!object.Body) throw new Error("empty body");
        const bytes = await object.Body.transformToByteArray();
        const checksum = createHash("sha256").update(bytes).digest("hex");
        if (bytes.byteLength !== Number(row.receipt_size_bytes) || object.ContentType !== row.receipt_mime || checksum !== row.receipt_checksum)
          metadata_or_size_mismatches.push({ key: row.receipt_key, reason: "mime, size, or checksum mismatch" });
      } catch (error) {
        const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        if (status === 404 || (error instanceof Error && error.name === "NoSuchKey")) missing_referenced_objects.push({ key: row.receipt_key });
        else throw error;
      }
    }
    const report = { missing_referenced_objects, orphan_objects, invalid_canonical_keys, metadata_or_size_mismatches };
    console.log(JSON.stringify(report, null, 2));
    if (Object.values(report).some((items) => items.length)) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
