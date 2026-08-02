import { z } from "zod";
import { getPromptType, promptBriefSchema, type PromptBrief, type PromptTypeId } from "./catalog";

const outputItemSchema = z.object({ label: z.string().min(1), content: z.string().min(1) });
export const promptGenerationResultSchema = z.object({
  version: z.literal(1),
  promptType: z.enum(["instagram-feed","carousel","story","content-series","product-ad","promo-discount","testimonial-review","product-photography","product-try-on","fnb-menu","short-video-script","video-storyboard","ugc-ad","youtube-thumbnail","marketing-copy","article","face-card","logo"]),
  title: z.string().min(1),
  readyOutput: z.array(outputItemSchema).min(1),
  technicalPrompt: z.string().optional(),
  negativePrompt: z.string().optional(),
  notes: z.array(z.string()).optional(),
});
export type PromptGenerationResult = z.infer<typeof promptGenerationResultSchema>;

function valueOrMissing(value: unknown) {
  return value === undefined || value === null || value === "" ? "[BUTUH DATA]" : String(value);
}

export function buildPromptRequest(raw: PromptBrief) {
  const brief = promptBriefSchema.parse(raw);
  const type = getPromptType(brief.promptType);
  const relevantOptions = type.fields.map((item) => `${item.label}: ${valueOrMissing(brief.options[item.key])}`).join("\n");
  const optional = [
    ["Penawaran", brief.offer], ["Tone", brief.tone], ["Style", brief.style],
    ["Platform", brief.platform], ["Rasio", brief.ratio], ["Palet warna", brief.colorPalette], ["Catatan", brief.notes],
  ].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join("\n");
  const proofRule = brief.promptType === "testimonial-review" ? "\nKhusus testimoni: jangan mengarang kutipan, rating, atau bukti. Gunakan [BUTUH DATA] bila bukti tidak tersedia." : "";

  return {
    systemPrompt: "Anda adalah creative director komersial Cubiqlo. Jawab dalam Bahasa Indonesia yang jelas, fokus, siap dipakai. Jangan tampilkan nama model/provider atau penjelasan internal.",
    userPrompt: `JENIS MATERI: ${type.name}\n\nBRIEF\nBrand: ${brief.brand}\nProduk/campaign: ${brief.campaign}\nGoal: ${brief.goal}\nAudience: ${brief.audience}${optional ? `\n${optional}` : ""}\n${relevantOptions}\n\nOUTPUT WAJIB\n${type.outputContract.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\nKembalikan JSON valid tanpa teks tambahan dengan shape: {"version":1,"promptType":"${brief.promptType}","title":"...","readyOutput":[{"label":"...","content":"..."}],"technicalPrompt":"opsional","negativePrompt":"opsional","notes":["opsional"]}. Jangan mengarang harga, deadline, statistik, klaim, bahan, garansi, atau bukti. Untuk fakta yang tidak diberikan, tulis [BUTUH DATA].${proofRule}`,
    brief,
  };
}

export function parsePromptResult(raw: string, fallbackType: PromptTypeId): { result: PromptGenerationResult; structured: boolean } {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed = promptGenerationResultSchema.parse(JSON.parse(cleaned));
    if (parsed.promptType !== fallbackType) throw new Error("Prompt type mismatch");
    return { result: parsed, structured: true };
  } catch {
    return {
      structured: false,
      result: { version: 1, promptType: fallbackType, title: getPromptType(fallbackType).name, readyOutput: [{ label: "Hasil", content: raw.trim() || "AI tidak mengembalikan hasil." }] },
    };
  }
}

export function serializePromptResult(result: PromptGenerationResult) {
  return JSON.stringify(result);
}

export function readStoredPromptResult(raw: string | null, promptType: PromptTypeId) {
  return parsePromptResult(raw ?? "", promptType).result;
}
