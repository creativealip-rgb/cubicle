import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const actionsDir = join(process.cwd(), "src/lib/actions");
const source = (name: string) => readFileSync(join(actionsDir, name), "utf8");

function exportedFunctionBody(file: string, functionName: string) {
  const text = source(file);
  const start = text.indexOf(`export async function ${functionName}(`);
  expect(start, `${functionName} missing in ${file}`).toBeGreaterThanOrEqual(0);
  const next = text.indexOf("\nexport async function ", start + 1);
  return text.slice(start, next === -1 ? text.length : next);
}

describe("client create portal wiring", () => {
  it("persists caller-provided portalSlugEnabled instead of hardcoding false", () => {
    const body = source("clients.ts");
    const start = body.indexOf("async function insertClient(");
    expect(start).toBeGreaterThanOrEqual(0);
    const next = body.indexOf("\nasync function ", start + 1);
    const insertBody = body.slice(start, next === -1 ? body.length : next);
    // Hardcoded false is gone.
    expect(insertBody).not.toContain("portalSlugEnabled: false");
    // Flag is derived from parsed input.
    expect(insertBody).toContain("portalSlugEnabled: parsed.portalSlug");
    expect(insertBody).toContain("Boolean(parsed.portalSlugEnabled)");
    // Safe default: no slug ⇒ disabled even if flag was sent true.
    expect(insertBody).toContain("parsed.portalSlug ? Boolean(parsed.portalSlugEnabled) : false");
  });

  it("sends portalSlugEnabled from the form slug (empty slug ⇒ disabled)", () => {
    const form = readFileSync("src/components/forms/client-form.tsx", "utf8");
    expect(form).toContain("portalSlugEnabled: Boolean(form.portalSlug)");
  });
});

describe("project create list freshness", () => {
  it("revalidates client detail, projects, and dashboard after create", () => {
    const body = exportedFunctionBody("projects.ts", "createProject");
    expect(body).toContain('revalidatePath(`/app/clients/${parsed.clientId}`)');
    expect(body).toContain('revalidatePath("/app/projects")');
    expect(body).toContain('revalidatePath("/app/dashboard")');
  });

  it("keeps client-side refresh after project create", () => {
    const dialog = readFileSync("src/components/projects/project-create-dialog.tsx", "utf8");
    expect(dialog).toContain("refresh()");
  });
});
