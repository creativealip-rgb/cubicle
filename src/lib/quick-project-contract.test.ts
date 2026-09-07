import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const action=readFileSync("src/lib/actions/projects.ts","utf8");
const form=readFileSync("src/components/forms/project-form.tsx","utf8");
const schema=readFileSync("src/db/schema.ts","utf8");
const migration=readFileSync("drizzle/0093_project_client_optional.sql","utf8");
describe("quick project",()=>{
 it("allows a project without a client",()=>{expect(action).toContain("clientId: z.string().uuid().optional().nullable()");expect(action).toContain("if (parsed.clientId) await assertClientInWorkspace");expect(schema).toContain('clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" })');expect(migration).toContain("ALTER COLUMN client_id DROP NOT NULL");});
 it("keeps advanced billing fields out of create mode",()=>{expect(form).toContain('mode === "edit"');expect(form).toContain('t("Klien (Opsional)", "Client (Optional)")');expect(form).toContain('t("Pengaturan Tagihan", "Billing Settings")');});
});
