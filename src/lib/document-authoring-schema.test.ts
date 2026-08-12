import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const schema = readFileSync("src/db/schema.ts", "utf8");
const migration = readFileSync("drizzle/0074_document_authoring.sql", "utf8");

describe("document authoring schema wiring", () => {
  it("allows drafts without a Client and stores recipient snapshots", () => {
    expect(schema).toContain('clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" })');
    expect(schema).toContain('clientName: text("client_name").notNull()');
    expect(schema).toContain('clientEmail: text("client_email")');
    expect(schema).toContain('companyName: text("company_name")');
  });

  it("has additive idempotent migration", () => {
    expect(migration).toContain('ALTER TABLE "proposals"');
    expect(migration).toContain('ALTER TABLE "contracts"');
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS");
    expect(migration).toContain("DROP NOT NULL");
  });
});
