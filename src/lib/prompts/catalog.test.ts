import { describe, expect, it } from "vitest";
import { launchPromptCatalog, mapLegacyPromptType, promptBriefSchema, displayOption } from "./catalog";
import { optionLabelEn, optionLabelId } from "./field-options";

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

  it("rejects NaN numeric option values", () => {
    const base = { brand: "Cubiqlo", campaign: "Launch", goal: "Signup", audience: "Freelancer" };
    const result = promptBriefSchema.safeParse({ ...base, promptType: "carousel", options: { slideCount: NaN, intent: "educational" } });
    expect(result.success).toBe(false);
  });

  it("validates testimonial rating as an optional 1-5 select", () => {
    const base = { brand: "Cubiqlo", campaign: "Launch", goal: "Signup", audience: "Freelancer" };
    const type = launchPromptCatalog.find((item) => item.id === "testimonial-review")!;
    const rating = type.fields.find((f) => f.key === "rating")!;
    expect(rating.required).toBeFalsy();
    expect(rating.options).toEqual(["1", "2", "3", "4", "5"]);
    // Optional: omitted rating is valid
    expect(promptBriefSchema.safeParse({ ...base, promptType: "testimonial-review", options: { context: "Bahan kulit" } }).success).toBe(true);
    // Rating outside 1-5 is rejected
    expect(promptBriefSchema.safeParse({ ...base, promptType: "testimonial-review", options: { rating: "6", context: "Bahan kulit" } }).success).toBe(false);
    expect(promptBriefSchema.safeParse({ ...base, promptType: "testimonial-review", options: { rating: "0", context: "Bahan kulit" } }).success).toBe(false);
  });

  it("keeps placement/channel keys stable while clarifying labels", () => {
    const productAd = launchPromptCatalog.find((item) => item.id === "product-ad")!;
    const placement = productAd.fields.find((f) => f.key === "placement")!;
    expect(placement.label).toBe("Platform iklan");
    expect(placement.labelEn).toBe("Ad platform");
    const marketing = launchPromptCatalog.find((item) => item.id === "marketing-copy")!;
    const channel = marketing.fields.find((f) => f.key === "channel")!;
    expect(channel.label).toBe("Platform / saluran");
    expect(channel.labelEn).toBe("Platform / channel");
  });

  it("maps legacy modes without destroying history", () => {
    expect(mapLegacyPromptType("9 Feed Konsisten")).toBe("content-series");
    expect(mapLegacyPromptType("Copy Writing")).toBe("marketing-copy");
    expect(mapLegacyPromptType("unknown old mode")).toBeNull();
  });
});

describe("Prompt option display labels", () => {
  it("localizes compact internal values without exposing them", () => {
    expect(displayOption("face", "id")).toBe("Tampilkan wajah");
    expect(displayOption("face", "en")).toBe("Show face");
    expect(displayOption("no-face", "en")).toBe("No face");
    expect(displayOption("short", "id")).toBe("Pendek");
    expect(displayOption("medium", "en")).toBe("Medium");
    expect(displayOption("long", "id")).toBe("Panjang");
    expect(displayOption("yes", "id")).toBe("Ya");
    expect(displayOption("no", "en")).toBe("No");
    expect(displayOption("3m", "id")).toBe("3 menit");
    expect(displayOption("3m", "en")).toBe("3 minutes");
    expect(displayOption("biweekly", "id")).toBe("2 minggu sekali");
  });

  it("keeps display-ready options unchanged", () => {
    expect(displayOption("Instagram", "id")).toBe("Instagram");
    expect(displayOption("Studio White", "en")).toBe("Studio White");
    expect(displayOption("educational", "id")).toBe("educational");
  });

  it("exposes raw labels via the helper maps for tests/UI", () => {
    expect(optionLabelId("face")).toBe("Tampilkan wajah");
    expect(optionLabelEn("biweekly")).toBe("Every 2 weeks");
  });
});
