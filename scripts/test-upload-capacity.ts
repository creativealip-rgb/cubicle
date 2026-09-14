import { createHash } from "node:crypto";

const PARALLEL = 20;
const BYTES = 50 * 1024 * 1024;
const CHUNK = 64 * 1024;
const HEAP_CEILING = 256 * 1024 * 1024;
const TIMEOUT_MS = 30_000;

async function validateLogicalUpload(id: number) {
  const hash = createHash("sha256");
  const chunk = Buffer.alloc(CHUNK, id);
  let bytes = 0;
  while (bytes < BYTES) {
    const size = Math.min(CHUNK, BYTES - bytes);
    hash.update(chunk.subarray(0, size));
    bytes += size;
    if ((bytes / CHUNK) % 64 === 0) await new Promise<void>((resolve) => setImmediate(resolve));
  }
  return { bytes, sha256: hash.digest("hex") };
}

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL?.includes("cubiqlo-new")) throw new Error("PRODUCTION_TARGET_FORBIDDEN");
  const startHeap = process.memoryUsage().heapUsed;
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("UPLOAD_CAPACITY_TIMEOUT")), TIMEOUT_MS));
  const results = await Promise.race([Promise.all(Array.from({ length: PARALLEL }, (_, id) => validateLogicalUpload(id))), timeout]);
  const peakDelta = process.memoryUsage().heapUsed - startHeap;
  if (results.length !== PARALLEL || results.some((result) => result.bytes !== BYTES || result.sha256.length !== 64)) throw new Error("UPLOAD_CAPACITY_RESULT_MISMATCH");
  if (peakDelta > HEAP_CEILING) throw new Error(`UPLOAD_CAPACITY_HEAP_EXCEEDED:${peakDelta}`);
  console.log(JSON.stringify({ parallel: PARALLEL, bytesPerUpload: BYTES, logicalBytes: PARALLEL * BYTES, chunkBytes: CHUNK, heapDeltaBytes: peakDelta, heapCeilingBytes: HEAP_CEILING, externalRequests: 0, estimatedExternalCostUsd: 0 }));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
