import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const page=readFileSync("src/app/(app)/app/clients/[clientId]/page.tsx","utf8");
const nav=readFileSync("src/components/clients/client-tabs-nav.tsx","utf8");
const section=readFileSync("src/app/(app)/app/clients/[clientId]/portal-section.tsx","utf8");
const schema=readFileSync("src/db/schema.ts","utf8");
describe("client portal password wiring",()=>{
 it("keeps portal available while overview is default",()=>{expect(page).toContain(': "overview"');expect(nav).toContain('value="portal"');});
 it("always renders slug URL without token",()=>{expect(section).toContain('/client-portal/${slug}');expect(section).not.toContain('?token=');});
 it("stores password hash and session version",()=>{expect(schema).toContain('portalPasswordHash');expect(schema).toContain('portalSessionVersion');});
});
