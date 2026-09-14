async function main() {
  const redisUrl = process.env.RATE_LIMIT_REDIS_URL;
  const baseUrl = process.env.CAPACITY_BASE_URL;
  const cookie = process.env.CAPACITY_SESSION_COOKIE;
  if (!redisUrl || !baseUrl || !cookie) throw new Error("RATE_LIMIT_REDIS_URL, CAPACITY_BASE_URL, and CAPACITY_SESSION_COOKIE are required");
  if (/cubiqlo\.com|cubiqlo-new|production/i.test(`${redisUrl} ${baseUrl}`)) throw new Error("PRODUCTION_TARGET_FORBIDDEN");
  const { redisExportAdmissionBackend: backend } = await import("../src/lib/export-admission");
  const run = `mixed-${Date.now()}`;
  const leases = await Promise.all(Array.from({ length: 5 }, (_, i) => backend.acquire({ userId: `${run}-u${i}`, workspaceId: run, endpoint: "mixed-export" })));
  const admitted = leases.filter((lease): lease is { ok: true; token: string } => lease.ok);
  const denied = leases.filter((lease): lease is { ok: false; dimension: "user" | "workspace" | "instance"; retryAfterSec: number } => !lease.ok);
  if (admitted.length !== 2 || denied.length !== 3 || denied.some((lease) => lease.dimension !== "workspace")) throw new Error(`contention mismatch:${JSON.stringify(leases)}`);
  const started = performance.now();
  const responses = await Promise.all(Array.from({ length: 100 }, () => fetch(`${baseUrl}/app/dashboard`, { headers: { cookie }, redirect: "manual" })));
  const elapsed = performance.now() - started;
  const failures = responses.filter((response) => response.status !== 200).length;
  await Promise.all(admitted.map((lease) => backend.release(lease.token)));
  if (failures) throw new Error(`CRUD_FAILURES:${failures}`);
  const retry = await backend.acquire({ userId: `${run}-retry`, workspaceId: run, endpoint: "mixed-export" });
  if (!retry.ok) throw new Error("released slot was not reusable");
  await backend.release(retry.token);
  console.log(JSON.stringify({ parallelExports: 5, admitted: 2, denied: 3, crudRequests: 100, crudFailures: 0, crudBatchMs: Math.round(elapsed), releaseRetry: "pass" }));
}
void main().then(() => process.exit(0)).catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
