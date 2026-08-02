import { describe, expect, it } from "vitest";
import { launchPromptCatalog, mapLegacyPromptType, promptBriefSchema } from "./catalog";

const ids = ["instagram-feed","carousel","story","content-series","product-ad","promo-discount","testimonial-review","product-photography","product-try-on","fnb-menu","short-video-script","video-storyboard","ugc-ad","youtube-thumbnail","marketing-copy","article","face-card","logo"];

describe("Prompt Studio catalog", () => {
  it("contains exactly 18 unique launch types", () => {
    expect(launchPromptCatalog.map((item) => item.id)).toEqual(ids);
    expect(new Set(ids).size).toBe(18);
  });

  it("covers five categories", () => {
    expect(new Set(launchPromptCatalog.map((item) => item.category)).size).toBe(5);
  });

  it("validates specialist quantities", () => {
    const base = { brand: "Cubiqlo", campaign: "Launch", goal: "Signup", audience: "Freelancer" };
    expect(promptBriefSchema.safeParse({ ...base, promptType: "carousel", options: { slideCount: 2, intent: "educational" } }).success).toBe(false);
    expect(promptBriefSchema.safeParse({ ...base, promptType: "story", options: { frameCount: 6, interactionType: "poll" } }).success).toBe(false);
    expect(promptBriefSchema.safeParse({ ...base, promptType: "content-series", options: { postCount: 4, cadence: "weekly" } }).success).toBe(false);
  });

  it("requires exactly one marketing copy format", () => {
    const result = promptBriefSchema.safeParse({ promptType: "marketing-copy", brand: "Cubiqlo", campaign: "Launch", goal: "Signup", audience: "Freelancer", options: { copyFormat: "", length: "short", channel: "Instagram" } });
    expect(result.success).toBe(false);
  });

  it("maps legacy modes without destroying history", () => {
    expect(mapLegacyPromptType("9 Feed Konsisten")).toBe("content-series");
    expect(mapLegacyPromptType("Copy Writing")).toBe("marketing-copy");
    expect(mapLegacyPromptType("unknown old mode")).toBeNull();
  });
});
