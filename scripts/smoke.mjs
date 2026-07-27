#!/usr/bin/env node

const baseUrl = (process.env.SMOKE_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const cronSecret = process.env.CRON_SECRET || "";
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10000);

const checks = [
  { name: "home", path: "/", expect: [200] },
  { name: "login", path: "/login", expect: [200] },
  { name: "signup", path: "/signup", expect: [200] },
  { name: "forgot password", path: "/forgot-password", expect: [200] },
  { name: "health", path: "/api/health", expect: [200], jsonOk: true },
  { name: "app redirects unauthenticated", path: "/app/dashboard", expect: [307, 308], redirect: "manual" },
  // Client portal renders an invalid-token page with HTTP 200 so crawlers/users see branded guidance.
  { name: "bad client portal token", path: "/client-portal/not-a-real-token", expect: [200, 404] },
  { name: "bad invoice token", path: "/invoice/not-a-real-token", expect: [404] },
  { name: "env audit guarded", path: "/api/health/env", expect: [401] },
  { name: "invoice overdue cron guarded", path: "/api/cron/invoice-overdue", expect: process.env.NODE_ENV === "production" ? [401, 503] : [200, 401, 503] },
];

if (cronSecret) {
  checks.push({
    name: "env audit with bearer",
    path: "/api/health/env",
    expect: [200, 503],
    headers: { authorization: `Bearer ${cronSecret}` },
    jsonOkField: true,
  });
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function passStatus(actual, expected) {
  return expected.includes(actual);
}

let failed = 0;
console.log(`Smoke target: ${baseUrl}`);

for (const check of checks) {
  const url = `${baseUrl}${check.path}`;
  try {
    const res = await fetchWithTimeout(url, {
      method: "GET",
      redirect: check.redirect || "follow",
      headers: check.headers || {},
    });
    const ok = passStatus(res.status, check.expect);
    let jsonOk = true;
    if (check.jsonOk || check.jsonOkField) {
      const body = await res.clone().json().catch(() => null);
      jsonOk = check.jsonOk ? Boolean(body?.ok || body?.status === "ok") : typeof body?.ok === "boolean";
    }
    if (!ok || !jsonOk) {
      failed += 1;
      console.error(`✗ ${check.name}: ${res.status} expected ${check.expect.join("/")}`);
    } else {
      console.log(`✓ ${check.name}: ${res.status}`);
    }
  } catch (err) {
    failed += 1;
    console.error(`✗ ${check.name}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

if (failed > 0) {
  console.error(`Smoke failed: ${failed} check(s)`);
  process.exit(1);
}

console.log("Smoke passed");
