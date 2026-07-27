#!/usr/bin/env node
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { Client } from "pg";
import { hashPassword } from "@better-auth/utils/password";

const expectedDatabase = "cubicle_dev";
const secretPath = process.env.DEV_ACCESS_SECRET_FILE ?? "/root/.secrets/cubiqlo-dev-access.txt";

function parseSecretFile(source: string) {
  const result = new Map<string, string>();
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    result.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  return result;
}

const secretFields = parseSecretFile(await readFile(secretPath, "utf8"));
const email = secretFields.get("QA Email")?.toLowerCase();
const password = secretFields.get("QA Password");

if (!email || !password) {
  throw new Error(`Missing QA Email or QA Password in ${secretPath}`);
}
if (password.length < 12) {
  throw new Error("QA Password must contain at least 12 characters");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const target = new URL(databaseUrl);
const targetDatabase = target.pathname.replace(/^\//, "");
if (targetDatabase !== expectedDatabase) {
  throw new Error(`Refusing QA seed: expected database ${expectedDatabase}, got ${targetDatabase || "<empty>"}`);
}

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
  const identity = await client.query<{ database: string }>("SELECT current_database() AS database");
  if (identity.rows[0]?.database !== expectedDatabase) {
    throw new Error(`Refusing QA seed: connected to ${identity.rows[0]?.database ?? "<unknown>"}`);
  }

  const passwordHash = await hashPassword(password);
  const userId = `devqa_${randomBytes(16).toString("hex")}`;
  const workspaceId = randomUUID();
  const accountId = randomUUID();
  const workspaceSlug = `dev-qa-${randomBytes(6).toString("hex")}`;

  await client.query("BEGIN");
  await client.query(
    `INSERT INTO users (id, name, email, email_verified, plan, created_at, updated_at)
     VALUES ($1, $2, $3, true, 'team', now(), now())
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       email_verified = true,
       plan = 'team',
       updated_at = now()`,
    [userId, "Cubiqlo Dev QA", email],
  );

  const user = await client.query<{ id: string }>("SELECT id FROM users WHERE lower(email) = lower($1)", [email]);
  const resolvedUserId = user.rows[0]?.id;
  if (!resolvedUserId) throw new Error("QA user insert did not return a user");

  await client.query("DELETE FROM accounts WHERE user_id = $1 AND provider_id = 'credential'", [resolvedUserId]);
  await client.query(
    `INSERT INTO accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
     VALUES ($1, $2, 'credential', $2, $3, now(), now())`,
    [accountId, resolvedUserId, passwordHash],
  );

  const membership = await client.query<{ workspace_id: string }>(
    "SELECT workspace_id FROM workspace_members WHERE user_id = $1 AND role = 'owner' ORDER BY created_at LIMIT 1",
    [resolvedUserId],
  );
  let resolvedWorkspaceId = membership.rows[0]?.workspace_id;

  if (!resolvedWorkspaceId) {
    resolvedWorkspaceId = workspaceId;
    await client.query(
      `INSERT INTO workspaces (id, name, slug, owner_id, default_currency, plan, created_at, updated_at)
       VALUES ($1, 'Cubiqlo Development QA', $2, $3, 'IDR', 'team', now(), now())`,
      [resolvedWorkspaceId, workspaceSlug, resolvedUserId],
    );
    await client.query(
      "INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at) VALUES ($1, $2, $3, 'owner', now())",
      [randomUUID(), resolvedWorkspaceId, resolvedUserId],
    );
  } else {
    await client.query(
      "UPDATE workspaces SET plan = 'team', updated_at = now() WHERE id = $1",
      [resolvedWorkspaceId],
    );
  }

  await client.query("DELETE FROM sessions WHERE user_id = $1", [resolvedUserId]);
  await client.query("COMMIT");

  console.log(`dev QA seed: PASS database=${expectedDatabase} email=${email} workspace=${resolvedWorkspaceId}`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
