import { describe, expect, it } from "vitest";
import { buildPromptRequest } from "./build-prompt";
import {
  launchPromptCatalog,
  nonOverlapFields,
  promptBriefSchema,
  resolveOverlapValue,
  splitOverlapDefaults,
} from "./catalog";

const base = { brand: "Cubiqlo", campaign: "Launch", goal: "Signup", audience: "Freelancer", options: {} };
const overlapGlobals = { platform: "", ratio: "", tone: "", offer: "" };

describe("Overlap key helpers", () => {
  it("resolves overlap values from options first, then globals", () => {
    expect(resolveOverlapValue("platform", { platform: "TikTok" }, overlapGlobals)).toBe("TikTok");
    expect(resolveOverlapValue("platform", {}, { ...overlapGlobals, platform: "Instagram" })).toBe("Instagram");
    expect(resolveOverlapValue("platform", { platform: "" }, { ...overlapGlobals, platform: "Instagram" })).toBe("Instagram");
  });

  it("returns undefined when neither source has a value", () => {
    expect(resolveOverlapValue("platform", {}, overlapGlobals)).toBeUndefined();
    expect(resolveOverlapValue("ratio", { ratio: "" }, { ...overlapGlobals, ratio: "" })).toBeUndefined();
  });

  it("never falls back to globals for non-overlap keys", () => {
    expect(resolveOverlapValue("slideCount", {}, { ...overlapGlobals, platform: "Instagram" })).toBeUndefined();
    expect(resolveOverlapValue("slideCount", { slideCount: 4 }, overlapGlobals)).toBe(4);
  });

  it("splits defaults into global seeds and type options", () => {
    const story = launchPromptCatalog.find((item) => item.id === "story")!;
    const { globals, options } = splitOverlapDefaults(story.defaults);
    expect(globals.ratio).toBe("9:16 (Story/Reels/TikTok)");
    expect(options.ratio).toBeUndefined();
    expect(options.frameCount).toBe(3);
    expect(options.interactionType).toBe("poll");
  });

  it("keeps only non-overlap fields in type detail sections", () => {
    const feed = launchPromptCatalog.find((item) => item.id === "instagram-feed")!;
    expect(nonOverlapFields(feed.fields)).toEqual([]);
    const ugc = launchPromptCatalog.find((item) => item.id === "ugc-ad")!;
    expect(nonOverlapFields(ugc.fields).map((item) => item.key)).toEqual(["duration", "creatorProfile", "objection", "proofAvailable"]);
  });
});

describe("Overlap resolution in validation", () => {
  it("accepts required overlap fields filled only via global form values", () => {
    // short-video-script requires platform and tone, both overlap keys
    const result = promptBriefSchema.safeParse({
      ...base,
      promptType: "short-video-script",
      platform: "TikTok",
      tone: "Friendly",
      options: { duration: "30 detik", presentation: "presenter" },
    });
    expect(result.success).toBe(true);
  });

  it("still rejects required overlap fields left empty everywhere", () => {
    const result = promptBriefSchema.safeParse({
      ...base,
      promptType: "short-video-script",
      options: { duration: "30 detik", presentation: "presenter" },
    });
    expect(result.success).toBe(false);
  });

  it("keeps non-overlap required validation unchanged", () => {
    expect(promptBriefSchema.safeParse({ ...base, promptType: "carousel", options: { slideCount: 5 } }).success).toBe(false);
    expect(promptBriefSchema.safeParse({ ...base, promptType: "carousel", options: { slideCount: 5, intent: "promotional" } }).success).toBe(true);
  });
});

describe("Overlap resolution in prompt building", () => {
  it("fills overlap fields from global brief values instead of [BUTUH DATA]", () => {
    const request = buildPromptRequest({
      ...base,
      promptType: "instagram-feed",
      platform: "Instagram",
      ratio: "4:5 (Portrait Feed)",
      tone: "Friendly",
      options: {},
    });
    expect(request.userPrompt).toContain("Platform: Instagram");
    expect(request.userPrompt).toContain("Rasio: 4:5 (Portrait Feed)");
    expect(request.userPrompt).toContain("Tone: Friendly");
  });

  it("omits overlap fields entirely since they're handled globally", () => {
    // Overlap keys are filtered out of the type-specific options section;
    // global form values feed the prompt instead.
    expect(nonOverlapFields(launchPromptCatalog.find(item => item.id === "instagram-feed")!.fields)).toEqual([]);
    const request = buildPromptRequest({ ...base, promptType: "instagram-feed", options: {} });
    expect(request.userPrompt).not.toContain("Platform: [BUTUH DATA]");
    expect(request.userPrompt).not.toContain("Tone: [BUTUH DATA]");
  });
});
