import { describe, it, expect } from "vitest";
import {
  personalSiteAiInputSchema,
  aiServicesOutputSchema,
  aiFaqOutputSchema,
  buildCopyPrompt,
  parseAiJson,
  extractChatContent,
  buildSectionPatch,
} from "@/lib/ai/copy";
import type { PersonalSiteAiInput } from "@/lib/ai/copy";
import type { PersonalSiteSection } from "@/lib/personal-site/model";

type ServicesSection = Extract<PersonalSiteSection, { type: "services" }>;
type FaqSection = Extract<PersonalSiteSection, { type: "faq" }>;
type CtaSection = Extract<PersonalSiteSection, { type: "cta" }>;

describe("AI copy generator — input/output schemas", () => {
  it("validates input schema strictly", () => {
    const validInput: PersonalSiteAiInput = {
      sectionType: "services",
      businessName: "Studio Kreatif",
      niche: "Digital marketing & website design",
      targetAudience: "UMKM Indonesia",
      offer: "Website landing page siap launch dalam 7 hari kerja",
      tone: "professional",
    };

    const result = personalSiteAiInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects input with empty required fields", () => {
    const invalidInput = {
      sectionType: "faq" as const,
      businessName: "",
      niche: "test",
      targetAudience: "test",
      offer: "test",
      tone: "friendly",
    };

    const result = personalSiteAiInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("businessName"))).toBe(true);
    }
  });

  it("rejects tone outside allowed enum values", () => {
    const input = {
      sectionType: "cta" as const,
      businessName: "Test",
      niche: "Test",
      targetAudience: "Test",
      offer: "Test",
      tone: "random" as any,
    };

    const result = personalSiteAiInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("enforces exact card/item counts", () => {
    // Services must be exactly 3 cards
    const validServices = aiServicesOutputSchema.safeParse({
      heading: "Layanan Kami",
      cards: [
        { title: "Service A", description: "Desc A" },
        { title: "Service B", description: "Desc B" },
        { title: "Service C", description: "Desc C" },
      ],
    });
    expect(validServices.success).toBe(true);

    // Only 2 cards should fail
    const invalidServices = aiServicesOutputSchema.safeParse({
      heading: "Layanan Kami",
      cards: [{ title: "A", description: "B" }, { title: "C", description: "D" }],
    });
    expect(invalidServices.success).toBe(false);

    // FAQ must be exactly 5 items
    const validFaq = aiFaqOutputSchema.safeParse({
      heading: "Pertanyaan Umum",
      items: Array.from({ length: 5 }, (_, i) => ({
        question: `Question ${i + 1}`,
        answer: `Answer ${i + 1}`,
      })),
    });
    expect(validFaq.success).toBe(true);

    // Only 4 FAQs should fail
    const invalidFaq = aiFaqOutputSchema.safeParse({
      heading: "FAQ",
      items: Array.from({ length: 4 }, (_, i) => ({
        question: `Q${i + 1}`,
        answer: `A${i + 1}`,
      })),
    });
    expect(invalidFaq.success).toBe(false);
  });
});

describe("prompt building — content & constraints", () => {
  const baseInput: PersonalSiteAiInput = {
    sectionType: "services",
    businessName: "Design Studio",
    niche: "UI/UX Design",
    targetAudience: "Startup Indonesia",
    offer: "Redesign produk digital dengan fokus konversi",
    tone: "friendly",
  };

  it("produces system prompt that instructs JSON-only response", () => {
    const prompts = buildCopyPrompt(baseInput);
    expect(prompts.system).toContain("HANYA dengan satu objek JSON");
    expect(prompts.system).toContain("tanpa markdown");
    expect(prompts.system).toContain("tanpa code fence");
  });

  it("includes business context in user prompt", () => {
    const prompts = buildCopyPrompt(baseInput);
    expect(prompts.user).toContain("Design Studio");
    expect(prompts.user).toContain("UI/UX Design");
    expect(prompts.user).toContain("Startup Indonesia");
    expect(prompts.user).toContain("Redesign produk digital");
    expect(prompts.user).toContain("friendly");
  });

  it("includes exact count instructions per section type", () => {
    const servicesPrompts = buildCopyPrompt({ ...baseInput, sectionType: "services" });
    expect(servicesPrompts.user).toContain("Buat tepat 3 kartu layanan");
    expect(servicesPrompts.user).toMatch(/cards.*\[.*\]/);

    const faqPrompts = buildCopyPrompt({ ...baseInput, sectionType: "faq" });
    expect(faqPrompts.user).toContain("Buat tepat 5 pertanyaan FAQ");

    const ctaPrompts = buildCopyPrompt({ ...baseInput, sectionType: "cta" });
    expect(ctaPrompts.user).toContain("heading maksimal 80 karakter");
  });
});

describe("JSON parsing — raw/fenced support", () => {
  it("parses raw JSON without fences", () => {
    const jsonStr = '{"heading":"Title","cards":[{"title":"A","description":"B"},{"title":"C","description":"D"},{"title":"E","description":"F"}]}';
    const result = parseAiJson(jsonStr);
    expect(result).toHaveProperty("heading", "Title");
    expect(Array.isArray((result as any).cards)).toBe(true);
    expect((result as any).cards).toHaveLength(3);
  });

  it("parses fenced ```json block", () => {
    const text = '```json\n{\n  "heading": "Our Services",\n  "cards": [\n    {"title": "X", "description": "Y"},\n    {"title": "Z", "description": "W"},\n    {"title": "K", "description": "L"}\n  ]\n}\n```';
    const result = parseAiJson(text);
    expect((result as any).heading).toBe("Our Services");
    expect((result as any).cards).toHaveLength(3);
  });

  it("extracts JSON from surrounding prose (first brace pair)", () => {
    const text = 'Here\'s what I generated:\n{"heading":"CTA Title","text":"Join us today!","buttonLabel":"Get Started"}\nLet me know what you think.';
    const result = parseAiJson(text);
    expect((result as any).heading).toBe("CTA Title");
    expect((result as any).buttonLabel).toBe("Get Started");
  });

  it("throws when no valid JSON can be recovered", () => {
    expect(() => parseAiJson("   ")).toThrow();
    expect(() => parseAiJson("not json at all")).toThrow();
    expect(() => parseAiJson('{"broken":"unclosed"')).toThrow();
  });

  it("handles SSE-style extracted content correctly", () => {
    const sseData = `data: {"choices":[{"delta":{"content":"{\\"heading\\":\\"Hello\\"}"}}]}\ndata: {"choices":[{"delta":{"content":""}}]}`;
    const content = extractChatContent(sseData);
    const parsed = parseAiJson(content) as { heading: string };
    expect(parsed.heading).toBe("Hello");
  });
});

describe("section patch building — fresh IDs and schema compliance", () => {
  it("generates services section with fresh unique ID and item IDs", () => {
    const input: PersonalSiteAiInput = {
      sectionType: "services",
      businessName: "Test",
      niche: "Test",
      targetAudience: "Test",
      offer: "Test",
      tone: "minimal",
    };

    const output = {
      heading: "My Services",
      cards: [
        { title: "First", description: "desc1" },
        { title: "Second", description: "desc2" },
        { title: "Third", description: "desc3" },
      ],
    };

    let idCounter = 0;
    const nextId = () => `fake-${++idCounter}`;

    const patch = buildSectionPatch(input, output, nextId) as ServicesSection;

    expect(patch.type).toBe("services");
    expect(patch.heading).toBe("My Services");
    expect(patch.items).toHaveLength(3);

    // Section ID should be fresh
    expect(patch.id.startsWith("fake-")).toBe(true);
    // Item IDs should derive deterministically from section ID
    expect(patch.items[0].id).toMatch(/^fake-\d+-item-1$/);
    expect(patch.items[1].id).toMatch(/^fake-\d+-item-2$/);
    expect(patch.items[2].id).toMatch(/^fake-\d+-item-3$/);
  });

  it("generates FAQ section with exactly 5 items and fresh IDs", () => {
    const input: PersonalSiteAiInput = {
      sectionType: "faq",
      businessName: "Test",
      niche: "Test",
      targetAudience: "Test",
      offer: "Test",
      tone: "friendly",
    };

    const output = {
      heading: "FAQ",
      items: Array.from({ length: 5 }, (_, i) => ({
        question: `Question ${i + 1}`,
        answer: `Answer ${i + 1}`,
      })),
    };

    const patch = buildSectionPatch(input, output) as FaqSection;

    expect(patch.type).toBe("faq");
    expect(patch.items).toHaveLength(5);
    expect(patch.id).toMatch(/[a-f0-9-]{36}/); // random UUID-like
    // Item IDs derive deterministically from the section ID (uuid-item-N)
    expect(patch.items[0].id).toBe(`${patch.id}-item-1`);
    expect(patch.items[4].id).toBe(`${patch.id}-item-5`);
  });

  it("generates CTA section with fresh ID", () => {
    const input: PersonalSiteAiInput = {
      sectionType: "cta",
      businessName: "Test",
      niche: "Test",
      targetAudience: "Test",
      offer: "Test",
      tone: "bold",
    };

    const output = {
      heading: "Ready to Get Started?",
      text: "Book a call today and we'll discuss how we can help.",
      buttonLabel: "Book a Call",
    };

    const patch = buildSectionPatch(input, output) as CtaSection;

    expect(patch.type).toBe("cta");
    expect(patch.heading).toBe("Ready to Get Started?");
    expect(patch.buttonLabel).toBe("Book a Call");
    expect(patch.text).toBe("Book a call today and we'll discuss how we can help.");
  });

  it("throws when output doesn't match expected structure", () => {
    const input: PersonalSiteAiInput = {
      sectionType: "services",
      businessName: "Test",
      niche: "Test",
      targetAudience: "Test",
      offer: "Test",
      tone: "professional",
    };

    // Invalid: missing cards array
    expect(() => buildSectionPatch(input, { heading: "Test" as any })).toThrow();
    // Invalid: wrong number of cards
    expect(() =>
      buildSectionPatch(input, { heading: "Test", cards: [{ title: "A", description: "B" }] })
    ).toThrow();
    // Invalid: wrong field types
    expect(() =>
      buildSectionPatch(input, { heading: 123 as any, cards: [] })
    ).toThrow();
  });
});
