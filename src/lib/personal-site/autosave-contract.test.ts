import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  readPublicationIntent,
  resolvePublicationState,
  withPublicationIntent,
} from "./publication-intent";

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
