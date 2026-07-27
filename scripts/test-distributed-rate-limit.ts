import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "redis";
import { checkDistributedRateLimit, closeRateLimitBackend } from "../src/lib/distributed-rate-limit";

const config = { limit: 10, windowSec: 3 };

async function runWorker(key: string) {
  const results = await Promise.all(
    Array.from({ length: 50 }, () => checkDistributedRateLimit(key, config)),
  );
  process.stdout.write(String(results.filter((result) => result.allowed).length));
  await closeRateLimitBackend();
}

async function main() {
  const url = process.env.RATE_LIMIT_REDIS_URL;
  if (!url) throw new Error("RATE_LIMIT_REDIS_URL is required");

  if (process.argv[2] === "worker") {
    const workerKey = process.argv[3];
    if (!workerKey) throw new Error("worker key required");
    await runWorker(workerKey);
    process.exit(0);
  }

  const key = `proof:${randomUUID()}`;
  const redisKey = `cubiqlo:rate:${key}`;
  const redis = createClient({ url });
  await redis.connect();
  try {
    const spawnWorker = () => new Promise<number>((resolve, reject) => {
      const child = spawn(process.execPath, ["--import", "tsx", process.argv[1], "worker", key], {
        env: process.env,
        stdio: ["ignore", "pipe", "inherit"],
      });
      let output = "";
      child.stdout.on("data", (chunk) => { output += chunk; });
      child.on("exit", (code) => code === 0 ? resolve(Number(output)) : reject(new Error(`worker exit ${code}`)));
    });

    const [allowedA, allowedB] = await Promise.all([spawnWorker(), spawnWorker()]);
    const ttlAfterConcurrency = await redis.pTTL(redisKey);
    if (allowedA + allowedB !== 10) throw new Error(`atomicity failed: ${allowedA + allowedB} allowed`);
    if (ttlAfterConcurrency <= 0 || ttlAfterConcurrency > 3000) throw new Error(`invalid ttl ${ttlAfterConcurrency}`);

    const restartAllowed = execFileSync(process.execPath, ["--import", "tsx", process.argv[1], "worker", key], {
      env: process.env,
      encoding: "utf8",
    }).trim();
    if (restartAllowed !== "0") throw new Error(`restart persistence failed: ${restartAllowed}`);

    await new Promise((resolve) => setTimeout(resolve, ttlAfterConcurrency + 150));
    const reset = await checkDistributedRateLimit(key, config);
    if (!reset.allowed || reset.remaining !== 9) throw new Error(`window reset failed: ${JSON.stringify(reset)}`);

    console.log(JSON.stringify({
      concurrentAllowed: allowedA + allowedB,
      concurrentRejected: 90,
      ttlAfterConcurrency,
      restartAllowed: Number(restartAllowed),
      resetAllowed: reset.allowed,
      resetRemaining: reset.remaining,
    }));
  } finally {
    await closeRateLimitBackend();
    await redis.del(redisKey);
    await redis.quit();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
