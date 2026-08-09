import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const actionsDir = join(process.cwd(), "src/lib/actions");
const clientsSource = readFileSync(join(actionsDir, "clients.ts"), "utf8");
const formSource = readFileSync("src/components/forms/client-form.tsx", "utf8");
const helpersSource = readFileSync("src/lib/portal-slug.ts", "utf8");

describe("client portal slug unique generation wiring", () => {
  it("exports a preflight server action that checks global uniqueness", () => {
    const start = clientsSource.indexOf("export async function generateUniquePortalSlug(");
    expect(start).toBeGreaterThanOrEqual(0);
    const next = clientsSource.indexOf("\nexport async function ", start + 1);
    const body = clientsSource.slice(start, next === -1 ? clientsSource.length : next);

    // Deterministic suffix candidates from the shared helper.
    expect(body).toContain("buildPortalSlugCandidates(basis || \"\")");
    // Uniqueness is checked against the whole clients table (DB index is global).
    expect(body).toContain("eq(clients.portalSlug, candidate)");
    // No workspace filter on the availability query — must mirror the global
    // partial unique index clients_portal_slug_unique.
    expect(body).not.toContain("eq(clients.workspaceId");
    // Edit mode excludes the client's own row.
    expect(body).toContain("excludeClientId ? ne(clients.id, excludeClientId) : undefined");
  });

  it("names the offending slug in create/update duplicate errors", () => {
    const insert = clientsSource.slice(
      clientsSource.indexOf("async function insertClient("),
      clientsSource.indexOf("\nasync function ", clientsSource.indexOf("async function insertClient(") + 1),
    );
    expect(insert).toContain("clients_portal_slug_unique");
    expect(insert).toContain("`Slug URL portal \"${slug}\" sudah digunakan");
    expect(insert).toContain("`Portal URL slug \"${slug}\" is already in use");

    const update = clientsSource.slice(
      clientsSource.indexOf("export async function updateClient("),
      clientsSource.indexOf("\nexport async function ", clientsSource.indexOf("export async function updateClient(") + 1),
    );
    expect(update).toContain("clients_portal_slug_unique");
    expect(update).toContain("`Slug URL portal \"${slug}\" sudah digunakan");
  });

  it("form regenerate button queries the server action instead of pure client slugify", () => {
    expect(formSource).toContain("generateUniquePortalSlug");
    // No longer a synchronous pure-client regenerate.
    expect(formSource).not.toContain("function regeneratePortalSlug() {\n    set(\"portalSlug\", slugify(form.companyName || form.name));");
    // Loading state on the button while generating.
    expect(formSource).toContain("generatingSlug");
    expect(formSource).toContain('disabled={generatingSlug}');
  });

  it("client form keeps explicit user-typed slug behavior via live slugify", () => {
    expect(formSource).toContain('onChange={(e) => set("portalSlug", slugify(e.target.value))}');
  });

  it("shared helper keeps candidate generation free of server-only imports", () => {
    expect(helpersSource).not.toContain('"use server"');
    expect(helpersSource).not.toContain("next/headers");
    expect(helpersSource).not.toContain("drizzle-orm");
  });
});
