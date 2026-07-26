import { describe, expect, it } from "vitest";
import { buildPromptRequest, parsePromptResult } from "./build-prompt";

const base = { brand: "Cubiqlo", campaign: "Launch", goal: "Signup", audience: "Freelancer", offer: "", tone: "", style: "", platform: "", ratio: "", colorPalette: "", notes: "", model: "ag/gemini-pro-agent" };

describe("Prompt Studio generation contract", () => {
  it("uses chosen carousel quantity and excludes irrelevant fields", () => {
    const request = buildPromptRequest({ ...base, promptType: "carousel", options: { slideCount: 4, intent: "educational" } });
    expect(request.userPrompt).toContain("4");
    expect(request.userPrompt).toContain("Jumlah slide");
    expect(request.userPrompt).not.toContain("Profil model");
  });

  it("marks absent promo facts instead of inventing them", () => {
    const request = buildPromptRequest({ ...base, promptType: "promo-discount", options: {} });
    expect(request.userPrompt).toContain("[BUTUH DATA]");
    expect(request.userPrompt).toContain("Jangan mengarang");
  });

  it("never invents testimonial proof", () => {
    const request = buildPromptRequest({ ...base, promptType: "testimonial-review", options: { context: "SaaS" } });
    expect(request.userPrompt).toContain("[BUTUH DATA]");
    expect(request.userPrompt).toContain("testimoni");
  });

  it("parses fenced structured JSON", () => {
    const parsed = parsePromptResult('```json\n{"version":1,"promptType":"instagram-feed","title":"Launch","readyOutput":[{"label":"Caption","content":"Coba sekarang"}]}\n```', "instagram-feed");
    expect(parsed.structured).toBe(true);
    expect(parsed.result.readyOutput[0].label).toBe("Caption");
  });

  it("returns readable fallback for provider text", () => {
    const parsed = parsePromptResult("Headline\nCoba sekarang", "product-ad");
    expect(parsed.structured).toBe(false);
    expect(parsed.result.readyOutput[0].content).toContain("Coba sekarang");
  });
});
