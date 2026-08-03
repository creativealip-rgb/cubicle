import { z } from "zod";
import {
  personalSiteSectionSchema,
  type PersonalSiteSection,
} from "@/lib/personal-site/model";

/**
 * Landing Builder AI copy — pure helpers.
 *
 * Everything in this module is side-effect free (no fetch, no DB, no fs) so it
 * can be unit-tested directly. The server action in
 * `src/lib/actions/personal-site-ai.ts` wires auth + the 9Router/OpenAI
 * compatible endpoint around these helpers and only ever returns a section
 * patch — it never writes to the client's site state.
 */

export const PERSONAL_SITE_AI_SECTION_TYPES = ["services", "faq", "cta"] as const;
export const PERSONAL_SITE_AI_TONES = ["professional", "friendly", "bold", "minimal"] as const;

export const MISSING_AI_KEY_MESSAGE = "AI belum dikonfigurasi di environment ini.";
export const AI_PROVIDER_ERROR_MESSAGE = "Layanan AI sedang bermasalah. Coba lagi beberapa saat.";
export const AI_PARSE_ERROR_MESSAGE = "Jawaban AI tidak sesuai format. Coba generate ulang.";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const personalSiteAiInputSchema = z.object({
  sectionType: z.enum(PERSONAL_SITE_AI_SECTION_TYPES),
  businessName: z.string().trim().min(1).max(80),
  niche: z.string().trim().min(1).max(160),
  targetAudience: z.string().trim().min(1).max(240),
  offer: z.string().trim().min(1).max(500),
  tone: z.enum(PERSONAL_SITE_AI_TONES),
});

export type PersonalSiteAiInput = z.infer<typeof personalSiteAiInputSchema>;

// ---------------------------------------------------------------------------
// Output schemas — exact shapes the model must return
// ---------------------------------------------------------------------------

const aiHeadingSchema = z.string().trim().min(1).max(80);

export const aiServicesOutputSchema = z.object({
  heading: aiHeadingSchema,
  cards: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(100),
        description: z.string().trim().min(1).max(500),
      }),
    )
    .length(3),
});

export const aiFaqOutputSchema = z.object({
  heading: aiHeadingSchema,
  items: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(200),
        answer: z.string().trim().min(1).max(1_000),
      }),
    )
    .length(5),
});

export const aiCtaOutputSchema = z.object({
  heading: aiHeadingSchema,
  text: z.string().trim().min(1).max(500),
  buttonLabel: z.string().trim().min(1).max(60),
});

export type AiServicesOutput = z.infer<typeof aiServicesOutputSchema>;
export type AiFaqOutput = z.infer<typeof aiFaqOutputSchema>;
export type AiCtaOutput = z.infer<typeof aiCtaOutputSchema>;

// ---------------------------------------------------------------------------
// API key resolution (env portion is pure; the secret-file check lives in the
// action because it needs fs)
// ---------------------------------------------------------------------------

export function resolveApiKeyFromEnv(env: Record<string, string | undefined>): string {
  return (
    env.AI_API_KEY ||
    env.NINE_ROUTER_API_KEY ||
    env.ROUTER_API_KEY ||
    env.OPENAI_API_KEY ||
    ""
  );
}

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------

const TONE_DESCRIPTIONS: Record<PersonalSiteAiInput["tone"], string> = {
  professional: "profesional, rapi, dan meyakinkan",
  friendly: "ramah, hangat, dan mudah didekati",
  bold: "berani, energik, dan langsung ke inti",
  minimal: "ringkas, bersih, dan fokus",
};

export function buildCopyPrompt(input: PersonalSiteAiInput): { system: string; user: string } {
  const shapeInstructions: Record<PersonalSiteAiInput["sectionType"], string> = {
    services: [
      'Buat tepat 3 kartu layanan.',
      'Format JSON wajib: {"heading": "...", "cards": [{"title": "...", "description": "..."}, {"title": "...", "description": "..."}, {"title": "...", "description": "..."}]}',
      "heading maksimal 80 karakter, title maksimal 100 karakter, description maksimal 500 karakter dan fokus pada manfaat untuk klien.",
    ].join(" "),
    faq: [
      "Buat tepat 5 pertanyaan FAQ beserta jawabannya.",
      'Format JSON wajib: {"heading": "...", "items": [{"question": "...", "answer": "..."}]} dengan 5 elemen di array items.',
      "heading maksimal 80 karakter, question maksimal 200 karakter, answer maksimal 1000 karakter dan benar-benar menjawab.",
    ].join(" "),
    cta: [
      "Buat ajakan bertindak (call-to-action) yang kuat.",
      'Format JSON wajib: {"heading": "...", "text": "...", "buttonLabel": "..."}',
      "heading maksimal 80 karakter, text maksimal 500 karakter, buttonLabel maksimal 60 karakter dan memakai kata kerja aksi.",
    ].join(" "),
  };

  const system = [
    "Kamu adalah copywriter landing page profesional untuk freelancer dan studio kecil di Indonesia.",
    "Tulis semua copy dalam Bahasa Indonesia yang natural.",
    "Balas HANYA dengan satu objek JSON valid tanpa markdown, tanpa code fence, dan tanpa teks tambahan.",
  ].join(" ");

  const user = [
    `Konteks bisnis:`,
    `- Nama bisnis: ${input.businessName}`,
    `- Niche/spesialisasi: ${input.niche}`,
    `- Target audiens: ${input.targetAudience}`,
    `- Penawaran utama: ${input.offer}`,
    `- Nada bahasa: ${input.tone} (${TONE_DESCRIPTIONS[input.tone]})`,
    "",
    shapeInstructions[input.sectionType],
  ].join("\n");

  return { system, user };
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

/**
 * Extract assistant content from an OpenAI-compatible chat completion body.
 * Handles both SSE (`data: {...}` chunks, possibly multiple) and a single JSON
 * object. Returns the accumulated content string.
 */
export function extractChatContent(rawText: string): string {
  const text = rawText.trim();
  if (!text) return "";

  const dataLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== "[DONE]");

  if (dataLines.length) {
    let content = "";
    for (const chunk of dataLines) {
      try {
        const data = JSON.parse(chunk);
        content +=
          data.choices?.[0]?.delta?.content ??
          data.choices?.[0]?.message?.content ??
          "";
      } catch {
        // skip malformed chunk
      }
    }
    return content.trim();
  }

  try {
    const data = JSON.parse(text);
    if (data && typeof data === "object" && "choices" in data) {
      return String(data.choices?.[0]?.message?.content ?? "").trim();
    }
  } catch {
    // fall through — treat as plain text
  }

  return text;
}

/**
 * Parse the model's content into a JSON value. Accepts raw JSON, a fenced
 * ```json block, or JSON embedded in surrounding prose. Throws when no JSON
 * object/array can be recovered.
 */
export function parseAiJson(rawText: string): unknown {
  const text = rawText.trim();
  if (!text) throw new Error("AI response is empty");

  const candidates: string[] = [];
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]?.trim()) candidates.push(fenceMatch[1].trim());
  candidates.push(text);
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // try next candidate
    }
  }

  throw new Error("AI response is not valid JSON");
}

// ---------------------------------------------------------------------------
// Section patch building
// ---------------------------------------------------------------------------

/** Generates fresh ids; injectable so tests can use deterministic values. */
export type AiIdFactory = () => string;

export const defaultAiIdFactory: AiIdFactory = () => crypto.randomUUID();

/**
 * Validate the parsed AI output for `input.sectionType` and convert it into a
 * canonical `PersonalSiteSection` patch with fresh nested ids (section id is
 * fresh per call; item ids derive deterministically from the section id).
 * Throws when the output does not match the exact schema.
 */
export function buildSectionPatch(
  input: PersonalSiteAiInput,
  parsed: unknown,
  nextId: AiIdFactory = defaultAiIdFactory,
): PersonalSiteSection {
  let patch: PersonalSiteSection;

  switch (input.sectionType) {
    case "services": {
      const output = aiServicesOutputSchema.parse(parsed);
      const sectionId = nextId();
      patch = {
        id: sectionId,
        type: "services",
        heading: output.heading,
        items: output.cards.map((card, index) => ({
          id: `${sectionId}-item-${index + 1}`,
          title: card.title,
          description: card.description,
        })),
      };
      break;
    }
    case "faq": {
      const output = aiFaqOutputSchema.parse(parsed);
      const sectionId = nextId();
      patch = {
        id: sectionId,
        type: "faq",
        heading: output.heading,
        items: output.items.map((item, index) => ({
          id: `${sectionId}-item-${index + 1}`,
          question: item.question,
          answer: item.answer,
        })),
      };
      break;
    }
    case "cta": {
      const output = aiCtaOutputSchema.parse(parsed);
      patch = {
        id: nextId(),
        type: "cta",
        heading: output.heading,
        text: output.text,
        buttonLabel: output.buttonLabel,
        buttonUrl: "",
      };
      break;
    }
  }

  // Exact validation against the canonical section schema before returning.
  return personalSiteSectionSchema.parse(patch);
}
