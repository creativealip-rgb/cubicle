import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  readPublicationIntent,
  resolvePublicationState,
  withPublicationIntent,
} from "./publication-intent";
import { resolveSaveConflict } from "./save-revision";

/**
 * Contract: `save` preserves the stored publication state; `publish` explicitly
 * sets true; `unpublish` explicitly sets false; an omitted intent is a plain
 * autosave and must never change publication.
 */
describe("personal-site autosave/publication contract", () => {
  // Negative tests are the point: plain autosave must never flip the live state.
  it("an omitted intent preserves the stored publication state", () => {
    expect(resolvePublicationState(undefined, true)).toBe(true);
    expect(resolvePublicationState(undefined, false)).toBe(false);
    expect(resolvePublicationState(null, true)).toBe(true);
    expect(resolvePublicationState("", true)).toBe(true);
  });

  it("an explicit 'save' preserves the stored publication state", () => {
    expect(resolvePublicationState("save", true)).toBe(true);
    expect(resolvePublicationState("save", false)).toBe(false);
  });

  it("an unrecognised (or legacy 'draft') intent preserves rather than unpublishes", () => {
    expect(resolvePublicationState("weird-future-intent", true)).toBe(true);
    expect(resolvePublicationState("draft", true)).toBe(true);
    expect(resolvePublicationState("weird-future-intent", false)).toBe(false);
  });

  it("only 'publish' explicitly turns publication on", () => {
    expect(resolvePublicationState("publish", false)).toBe(true);
    expect(resolvePublicationState("publish", true)).toBe(true);
  });

  it("only 'unpublish' explicitly turns publication off", () => {
    expect(resolvePublicationState("unpublish", true)).toBe(false);
    expect(resolvePublicationState("unpublish", false)).toBe(false);
  });

  it("carries explicit intent out-of-band, never into the stored document", () => {
    const site = withPublicationIntent({ published: true }, "publish");
    expect(readPublicationIntent(site)).toBe("publish");
    expect(JSON.stringify(site)).toBe('{"published":true}');
    expect(readPublicationIntent({})).toBeNull();
  });
});

describe("savePersonalSite wiring", () => {
  it("reads the stored row before deciding the publication state", () => {
    const source = readFileSync("src/lib/actions/personal-site.ts", "utf8");
    expect(source).toContain("resolvePublicationState(");
    expect(source.indexOf("const currentRow")).toBeLessThan(
      source.indexOf("personalSiteInputSchema.safeParse"),
    );
  });

  it("autosave no longer derives intent from the client's local published copy", () => {
    const client = readFileSync("src/components/site/canvas/canvas-page-client.tsx", "utf8");
    expect(client).toContain('readPublicationIntent(site) ?? "save"');
    expect(client).not.toContain('site.published ? "publish" : "draft"');
  });
});

/**
 * Contract (stale-tab protection): an update only applies while the row is
 * still at the revision the editor loaded. A stale editor gets a conflict —
 * never a silent last-write-wins overwrite, and never an auto-merge of two
 * JSON documents (there is no semantic merge for this document).
 */
describe("personal-site stale-revision conflict", () => {
  const loaded = new Date("2026-01-01T00:00:00.000Z");
  const advanced = new Date("2026-01-01T00:00:01.000Z");

  it("applies the save when the row is still at the loaded revision", () => {
    expect(resolveSaveConflict(loaded, loaded)).toBe("ok");
    expect(resolveSaveConflict(loaded.toISOString(), loaded)).toBe("ok");
  });

  it("refuses the save when another tab already advanced the revision", () => {
    expect(resolveSaveConflict(loaded, advanced)).toBe("conflict");
    expect(resolveSaveConflict(loaded.toISOString(), advanced.toISOString())).toBe("conflict");
  });

  it("treats a missing expected revision as a first save, never a conflict", () => {
    expect(resolveSaveConflict(null, advanced)).toBe("ok");
    expect(resolveSaveConflict(undefined, advanced)).toBe("ok");
  });

  it("fails closed on an unparsable revision or a vanished row", () => {
    expect(resolveSaveConflict("not-a-date", advanced)).toBe("conflict");
    expect(resolveSaveConflict(loaded, null)).toBe("conflict");
  });
});

describe("savePersonalSite stale-revision wiring", () => {
  it("makes the UPDATE conditional on the loaded revision and checks rows affected", () => {
    const source = readFileSync("src/lib/actions/personal-site.ts", "utf8");
    expect(source).toContain("resolveSaveConflict(");
    expect(source).toContain("eq(personalSites.updatedAt, expectedRevision)");
    expect(source).toContain(".returning({ id: personalSites.id })");
    expect(source).toContain("applied.length === 0");
  });

  it("only bypasses the guard through an explicit force flag", () => {
    const source = readFileSync("src/lib/actions/personal-site.ts", "utf8");
    expect(source).toContain('formData.get("force")');
  });

  it("threads the revision into every save payload and reads it back on success", () => {
    const client = readFileSync("src/components/site/canvas/canvas-page-client.tsx", "utf8");
    expect(client).toContain("initialRevision");
    expect(client).toContain('formData.set("revision"');
    expect(client).toContain("result.revision");
  });

  it("offers Reload or an explicit Keep-local force save in the editor", () => {
    const editor = readFileSync("src/components/site/canvas/canvas-editor.tsx", "utf8");
    expect(editor).toContain("onForceSave");
    expect(editor).toContain('data-testid="conflict-reload"');
    expect(editor).toContain('data-testid="conflict-keep-local"');
  });

  it("classifies a stale revision as terminal, so it is never retried", () => {
    const source = readFileSync("src/lib/use-retrying-autosave.ts", "utf8");
    expect(source).toContain("PERSONAL_SITE_STALE_REVISION");
  });
});
