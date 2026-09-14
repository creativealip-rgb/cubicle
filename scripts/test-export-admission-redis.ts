async function main() {
  if (!process.env.RATE_LIMIT_REDIS_URL) throw new Error("RATE_LIMIT_REDIS_URL is required");
  if (/cubiqlo-new-redis|production/i.test(process.env.RATE_LIMIT_REDIS_URL)) throw new Error("PRODUCTION_TARGET_FORBIDDEN");
  const { redisExportAdmissionBackend: backend } = await import("../src/lib/export-admission");
  const run = `test-${Date.now()}`;
  const leases = await Promise.all(Array.from({ length: 5 }, (_, i) => backend.acquire({ userId: `${run}-u${i}`, workspaceId: run, endpoint: "xlsx" })));
  const admitted = leases.filter((lease): lease is { ok: true; token: string } => lease.ok);
  const denied = leases.filter((lease): lease is { ok: false; dimension: "user" | "workspace" | "instance"; retryAfterSec: number } => !lease.ok);
  if (admitted.length !== 2 || denied.length !== 3 || denied.some((lease) => lease.dimension !== "workspace")) throw new Error(`contention mismatch: ${JSON.stringify(leases)}`);
  await Promise.all(admitted.map((lease) => backend.release(lease.token)));
  const retry = await backend.acquire({ userId: `${run}-retry`, workspaceId: run, endpoint: "xlsx" });
  if (!retry.ok) throw new Error("released slot was not reusable");
  await backend.release(retry.token);
  console.log(JSON.stringify({ parallel: 5, admitted: 2, denied: 3, dimension: "workspace", releaseRetry: "pass" }));
}
void main().then(() => process.exit(0)).catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
