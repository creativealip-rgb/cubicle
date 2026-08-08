import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const page=readFileSync("src/app/(app)/app/clients/[clientId]/page.tsx","utf8");
const nav=readFileSync("src/components/clients/client-tabs-nav.tsx","utf8");
const section=readFileSync("src/app/(app)/app/clients/[clientId]/portal-section.tsx","utf8");
const schema=readFileSync("src/db/schema.ts","utf8");
describe("client portal password wiring",()=>{
 it("makes portal first and default",()=>{expect(page).toContain(': "portal"');expect(nav.indexOf('value="portal"')).toBeLessThan(nav.indexOf('value="projects"'));});
 it("always renders slug URL without token",()=>{expect(section).toContain('/client-portal/${slug}');expect(section).not.toContain('?token=');});
 it("stores password hash and session version",()=>{expect(schema).toContain('portalPasswordHash');expect(schema).toContain('portalSessionVersion');});
});
