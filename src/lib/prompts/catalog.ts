import { z } from "zod";
import {
  toneOptions, platformOptions, ratioOptions,
  sceneOptions, cameraAngleOptions, lightingOptions, backgroundOptions,
  orientationOptions, voiceLanguageOptions, durationOptions, cadenceOptions,
} from "./field-options";

export const promptTypeIds = [
  "instagram-feed", "carousel", "story", "content-series", "product-ad",
  "promo-discount", "testimonial-review", "product-photography", "product-try-on",
  "fnb-menu", "short-video-script", "video-storyboard", "ugc-ad",
  "youtube-thumbnail", "marketing-copy", "article", "face-card", "logo",
] as const;

export type PromptTypeId = (typeof promptTypeIds)[number];
export type PromptCategory = "social-media" | "ads-promotion" | "product" | "video" | "brand-copy";
export type PromptOptionValue = string | number | boolean;

export type PromptFieldDefinition = {
  key: string;
  label: string;
  labelEn?: string;
  type: "text" | "number" | "select" | "textarea";
  required?: boolean;
  options?: readonly string[];
  min?: number;
  max?: number;
};

export type PromptCatalogEntry = {
  id: PromptTypeId;
  category: PromptCategory;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  iconKey: string;
  defaults: Record<string, PromptOptionValue>;
  fields: PromptFieldDefinition[];
  outputContract: readonly string[];
};

const field = (key: string, label: string, type: PromptFieldDefinition["type"] = "text", extra: Partial<PromptFieldDefinition> = {}): PromptFieldDefinition => ({ key, label, type, ...extra });
const entry = (id: PromptTypeId, category: PromptCategory, name: string, description: string, iconKey: string, fields: PromptFieldDefinition[], outputContract: string[], defaults: Record<string, PromptOptionValue> = {}, extra: { nameEn?: string; descriptionEn?: string } = {}): PromptCatalogEntry => ({ id, category, name, description, iconKey, fields, outputContract, defaults, ...extra });

/**
 * Keys that exist both as global form fields (prompt-studio sections C/D)
 * and as type-specific options inside catalog entries. The global form field
 * is the single source of truth for these keys; type entries must not render
 * or require a duplicate input for them.
 */
export const OVERLAP_KEYS = ["platform", "ratio", "tone", "offer"] as const;
export type OverlapKey = (typeof OVERLAP_KEYS)[number];
export type OverlapValues = Partial<Record<OverlapKey, PromptOptionValue | null | undefined>>;

export function isOverlapKey(key: string): key is OverlapKey {
  return (OVERLAP_KEYS as readonly string[]).includes(key);
}

/** Fields that are not covered by the global form sections. */
export function nonOverlapFields(fields: PromptFieldDefinition[]): PromptFieldDefinition[] {
  return fields.filter((item) => !isOverlapKey(item.key));
}

/**
 * Resolves the effective value of a catalog field, treating global form values
 * as the source of truth for overlap keys. Returns undefined when absent.
 */
export function resolveOverlapValue(
  key: string,
  options: Record<string, PromptOptionValue>,
  globals: OverlapValues,
): PromptOptionValue | undefined {
  const direct = options[key];
  if (direct !== undefined && direct !== null && direct !== "") return direct;
  if (isOverlapKey(key)) {
    const global = globals[key];
    if (global !== undefined && global !== null && global !== "") return global;
  }
  return direct === "" ? undefined : direct;
}

/**
 * Splits type defaults into global form values (overlap keys) and option
 * values, so switching type can seed the global fields instead of a hidden
 * duplicate in options.
 */
export function splitOverlapDefaults(defaults: Record<string, PromptOptionValue>): {
  globals: OverlapValues;
  options: Record<string, PromptOptionValue>;
} {
  const globals: OverlapValues = {};
  const options: Record<string, PromptOptionValue> = {};
  for (const [key, value] of Object.entries(defaults)) {
    if (isOverlapKey(key)) globals[key] = value;
    else options[key] = value;
  }
  return { globals, options };
}

export const launchPromptCatalog: PromptCatalogEntry[] = [
  entry("instagram-feed", "social-media", "Feed", "Konsep visual, caption, CTA, dan hashtag siap posting.", "instagram", [
    field("platform", "Platform", "select", { options: [...platformOptions] }),
    field("ratio", "Rasio", "select", { options: [...ratioOptions], labelEn: "Ratio" }),
    field("tone", "Tone", "select", { options: [...toneOptions] }),
  ], ["Konsep visual", "Prompt gambar", "Overlay", "Caption", "CTA", "Hashtag"], { ratio: "4:5 (Portrait Feed)" }, { nameEn: "Feed", descriptionEn: "Visual concept, caption, CTA, and ready-to-post hashtags." }),

  entry("carousel", "social-media", "Carousel", "Konten 3–10 slide dengan copy dan arahan visual.", "panels-top-left", [
    field("slideCount", "Jumlah slide", "number", { required: true, min: 3, max: 10, labelEn: "Slide count" }),
    field("intent", "Intent", "select", { required: true, options: ["educational", "promotional"] }),
  ], ["Struktur slide", "Copy per slide", "Arahan visual", "Caption", "CTA"], { slideCount: 5, intent: "educational" }, { nameEn: "Carousel", descriptionEn: "3–10 slide content with copy and visual direction." }),

  entry("story", "social-media", "Story", "Story 1–5 frame dengan interaksi dan CTA.", "smartphone", [
    field("frameCount", "Jumlah frame", "number", { required: true, min: 1, max: 5, labelEn: "Frame count" }),
    field("interactionType", "Interaksi", "select", { required: true, options: ["poll", "question", "quiz", "none"], labelEn: "Interaction" }),
  ], ["Frame", "Headline", "Arahan visual", "Interaksi", "CTA"], { frameCount: 3, interactionType: "poll", ratio: "9:16 (Story/Reels/TikTok)" }, { nameEn: "Story", descriptionEn: "1–5 frame story with interactions and CTA." }),

  entry("content-series", "social-media", "Content Series", "Campaign 3, 6, atau 9 post yang konsisten.", "layout-grid", [
    field("postCount", "Jumlah post", "select", { required: true, options: ["3", "6", "9"], labelEn: "Post count" }),
    field("cadence", "Jadwal terbit", "select", { required: true, options: [...cadenceOptions], labelEn: "Publish schedule" }),
  ], ["Peran setiap post", "Sistem visual", "Caption", "Saran jadwal"], { postCount: 3, cadence: "weekly" }, { nameEn: "Content Series", descriptionEn: "Consistent campaign of 3, 6, or 9 posts." }),

  entry("product-ad", "ads-promotion", "Iklan Produk", "Materi iklan produk fokus konversi.", "badge-megaphone", [
    field("offer", "Penawaran", "text", { labelEn: "Offer" }),
    field("placement", "Placement", "select", { required: true, options: [...platformOptions] }),
    field("ratio", "Rasio", "select", { required: true, options: [...ratioOptions], labelEn: "Ratio" }),
  ], ["Headline", "Subheadline", "Prompt visual", "Offer", "CTA", "Negative prompt"], {}, { nameEn: "Product Ad", descriptionEn: "Conversion-focused product ad material." }),

  entry("promo-discount", "ads-promotion", "Promo & Diskon", "Promo dengan hierarki harga dan urgensi jelas.", "badge-percent", [
    field("normalPrice", "Harga normal", "text", { labelEn: "Normal price" }),
    field("promoPrice", "Harga promo", "text", { labelEn: "Promo price" }),
    field("period", "Periode", "text", { labelEn: "Period" }),
    field("terms", "Syarat", "text", { labelEn: "Terms" }),
  ], ["Hierarki harga", "Badge promo", "Urgency copy", "CTA", "Layout"], {}, { nameEn: "Promo & Discount", descriptionEn: "Promotional content with clear price hierarchy and urgency." }),

  entry("testimonial-review", "ads-promotion", "Testimonial & Review", "Ubah bukti nyata menjadi materi review kredibel.", "message-square-quote", [
    field("proofSource", "Kutipan / sumber bukti", "textarea", { labelEn: "Quote / proof source" }),
    field("rating", "Rating"),
    field("context", "Konteks produk / layanan", "textarea", { required: true, labelEn: "Product / service context" }),
  ], ["Proof angle", "Hierarki kutipan", "Layout review", "Supporting copy", "CTA"], {}, { nameEn: "Testimonial & Review", descriptionEn: "Turn social proof into credible review assets." }),

  entry("product-photography", "product", "Product Photography", "Brief foto produk dengan kamera dan lighting terarah.", "camera", [
    field("scene", "Scene", "select", { required: true, options: [...sceneOptions] }),
    field("cameraAngle", "Sudut kamera", "select", { required: true, options: [...cameraAngleOptions], labelEn: "Camera angle" }),
    field("lighting", "Lighting", "select", { required: true, options: [...lightingOptions] }),
    field("background", "Background", "select", { required: true, options: [...backgroundOptions] }),
  ], ["Scene", "Camera", "Lighting", "Background", "Product treatment", "Negative prompt"], {}, { nameEn: "Product Photography", descriptionEn: "Product photography brief with directional camera and lighting." }),

  entry("product-try-on", "product", "Product Try-On", "Visual model memakai produk secara konsisten.", "shirt", [
    field("productCategory", "Kategori produk", "text", { required: true, labelEn: "Product category" }),
    field("modelProfile", "Profil model", "textarea", { required: true, labelEn: "Model profile" }),
    field("pose", "Pose", "select", { required: true, options: ["Standing", "Sitting", "Walking", "Action", "Close-Up Detail", "Lifestyle / Natural"] }),
    field("styling", "Styling", "textarea", { required: true }),
  ], ["Profil model", "Pose", "Styling", "Product placement", "Camera", "Consistency notes"], {}, { nameEn: "Product Try-On", descriptionEn: "Consistent visual of model wearing product." }),

  entry("fnb-menu", "product", "Menu F&B", "Menu dengan foto makanan dan hierarki harga.", "utensils", [
    field("menuName", "Nama item / menu", "text", { required: true, labelEn: "Item / menu name" }),
    field("showPrice", "Tampilkan harga", "select", { required: true, options: ["yes", "no"], labelEn: "Show price" }),
    field("mood", "Cuisine / venue mood", "select", { required: true, options: ["Casual & Fun", "Elegant & Premium", "Rustic & Warm", "Modern & Minimal", "Traditional / Heritage", "Street Food / Urban"] }),
  ], ["Hierarki menu", "Prompt foto", "Copy item", "Harga", "CTA"], {}, { nameEn: "F&B Menu", descriptionEn: "Menu layout with food photography and price hierarchy." }),

  entry("short-video-script", "video", "Short Video Script", "Script video pendek lengkap dengan shot dan overlay.", "clapperboard", [
    field("platform", "Platform", "select", { required: true, options: [...platformOptions] }),
    field("duration", "Durasi", "select", { required: true, options: [...durationOptions], labelEn: "Duration" }),
    field("presentation", "Format presenter", "select", { required: true, options: ["presenter", "faceless"], labelEn: "Presenter format" }),
    field("tone", "Tone", "select", { options: [...toneOptions] }),
  ], ["Hook", "Script", "Shot list", "Overlay", "B-roll", "CTA"], {}, { nameEn: "Short Video Script", descriptionEn: "Short video script complete with shots and overlays." }),

  entry("video-storyboard", "video", "Video Storyboard", "Storyboard scene-by-scene siap produksi.", "film", [
    field("duration", "Durasi", "select", { required: true, options: [...durationOptions], labelEn: "Duration" }),
    field("sceneCount", "Jumlah scene", "number", { required: true, min: 1, max: 20, labelEn: "Scene count" }),
    field("orientation", "Orientasi", "select", { required: true, options: [...orientationOptions], labelEn: "Orientation" }),
    field("voiceLanguage", "Bahasa VO", "select", { required: true, options: [...voiceLanguageOptions], labelEn: "VO Language" }),
  ], ["Durasi scene", "Visual", "Camera", "VO", "Overlay", "Transition", "Audio mood"], {}, { nameEn: "Video Storyboard", descriptionEn: "Production-ready scene-by-scene storyboard." }),

  entry("ugc-ad", "video", "UGC Ad", "Script UGC natural dari masalah sampai CTA.", "user-round", [
    field("platform", "Platform", "select", { required: true, options: [...platformOptions] }),
    field("duration", "Durasi", "select", { required: true, options: [...durationOptions], labelEn: "Duration" }),
    field("creatorProfile", "Profil kreator", "textarea", { required: true, labelEn: "Creator profile" }),
    field("objection", "Keberatan audiens", "textarea", { labelEn: "Audience objection" }),
    field("proofAvailable", "Bukti tersedia", "textarea", { labelEn: "Available proof" }),
  ], ["Natural hook", "Problem", "Demo", "Proof", "Objection handling", "CTA"], {}, { nameEn: "UGC Ad", descriptionEn: "Natural UGC script from problem to CTA." }),

  entry("youtube-thumbnail", "video", "YouTube Thumbnail", "Thumbnail kuat dengan teks singkat dan kontras.", "youtube", [
    field("videoTopic", "Topik / judul video", "textarea", { required: true, labelEn: "Topic / video title" }),
    field("subject", "Subjek", "text", { required: true, labelEn: "Subject" }),
    field("face", "Wajah", "select", { required: true, options: ["face", "no-face"], labelEn: "Face" }),
    field("textPreference", "Preferensi teks", "text", { labelEn: "Text preference" }),
  ], ["Subject", "Expression", "Composition", "Teks 3–5 kata", "Contrast", "Negative prompt"], {}, { nameEn: "YouTube Thumbnail", descriptionEn: "High-impact thumbnail with short text and strong contrast." }),

  entry("marketing-copy", "brand-copy", "Marketing Copy", "Satu format copy yang fokus dan siap dipakai.", "type", [
    field("copyFormat", "Format copy", "select", { required: true, options: ["caption", "ad-copy", "product-description", "headline-set", "cta-set", "broadcast-message"], labelEn: "Copy format" }),
    field("length", "Panjang", "select", { required: true, options: ["short", "medium", "long"], labelEn: "Length" }),
    field("channel", "Channel", "select", { required: true, options: [...platformOptions] }),
    field("tone", "Tone", "select", { options: [...toneOptions] }),
  ], ["Copy final", "CTA"], {}, { nameEn: "Marketing Copy", descriptionEn: "Focused marketing copy ready for use." }),

  entry("article", "brand-copy", "Artikel", "Artikel terstruktur dengan judul, isi, dan CTA siap edit.", "file-text", [
    field("topic", "Topik", "text", { required: true, labelEn: "Topic" }),
    field("length", "Panjang", "select", { required: true, options: ["short", "medium", "long"], labelEn: "Length" }),
    field("keywords", "Kata kunci", "text", { labelEn: "Keywords" }),
    field("tone", "Tone", "select", { options: [...toneOptions] }),
  ], ["Judul", "Artikel", "CTA"], {}, { nameEn: "Article", descriptionEn: "Structured article with title, body, and CTA ready for editing." }),

  entry("face-card", "brand-copy", "Face Card", "Analisis wajah dan rekomendasi styling untuk portrait profesional.", "scan-face", [
    field("analysisType", "Tipe analisis", "select", { required: true, options: ["Face Features", "Spectacles", "Style", "Color", "Makeup"], labelEn: "Analysis type" }),
    field("aesthetic", "Aesthetic", "select", { required: true, options: ["Editorial Magazine", "Natural Beauty", "High Fashion", "Commercial Clean", "Artistic Dramatic", "Soft Romantic"] }),
    field("backgroundTone", "Background Tone", "select", { required: true, options: ["Beige Ivory", "Cool Gray", "Warm Earth", "Pure White", "Deep Dark", "Pastel Soft"] }),
    field("typography", "Typography", "select", { options: ["Serif + Sans Hybrid", "Modern Sans", "Classic Serif", "Handwritten Script", "Bold Display"] }),
    field("colorMood", "Color Mood", "select", { options: ["Warm Tones", "Cool Tones", "Neutral Mono", "Vibrant Pop", "Muted Pastel", "High Contrast"] }),
  ], ["Analisis", "Rekomendasi styling", "Prompt visual", "Arahan fotografi", "Color palette"], {}, { nameEn: "Face Card", descriptionEn: "Facial analysis and styling recommendations for professional portraits." }),

  entry("logo", "brand-copy", "Logo", "Desain logo dan brand mockup siap pakai.", "hexagon", [
    field("logoStyle", "Gaya logo", "select", { required: true, options: ["Minimalist", "Vintage / Retro", "Modern Geometric", "Handwritten / Organic", "3D / Isometric", "Mascot / Character", "Lettermark / Monogram"], labelEn: "Logo style" }),
    field("colorScheme", "Skema warna", "select", { required: true, options: ["Monochrome", "Two-Tone", "Vibrant Multi", "Pastel Soft", "Dark Premium", "Gradient"], labelEn: "Color scheme" }),
    field("mockupType", "Tipe mockup", "select", { options: ["Business Card", "Letterhead", "Social Media Profile", "Packaging", "Merchandise", "Website Header", "Signage"], labelEn: "Mockup type" }),
    field("industry", "Industri", "text", { labelEn: "Industry" }),
  ], ["Konsep logo", "Prompt visual", "Variasi warna", "Mockup arahan", "Tipografi"], {}, { nameEn: "Logo", descriptionEn: "Logo design and ready-to-use brand mockups." }),
];

const baseSchema = z.object({
  promptType: z.enum(promptTypeIds),
  brand: z.string().trim().min(1),
  campaign: z.string().trim().min(1),
  goal: z.string().trim().min(1),
  audience: z.string().trim().min(1),
  offer: z.string().optional(), tone: z.string().optional(), style: z.string().optional(),
  platform: z.string().optional(), ratio: z.string().optional(), colorPalette: z.string().optional(),
  notes: z.string().optional(), model: z.string().optional(),
  options: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export const promptBriefSchema = baseSchema.superRefine((value, ctx) => {
  const definition = launchPromptCatalog.find((item) => item.id === value.promptType)!;
  // Build global form state for overlap resolution
  const globals: OverlapValues = {
    platform: value.platform || null,
    ratio: value.ratio || null,
    tone: value.tone || null,
    offer: value.offer || null,
  };

  for (const spec of definition.fields.filter((item) => item.required)) {
    // Resolve value accounting for overlap with global form fields
    const candidate = resolveOverlapValue(spec.key, value.options, globals);

    if (candidate === undefined || candidate === null || candidate === "") {
      ctx.addIssue({ code: "custom", path: ["options", spec.key], message: `${spec.label} wajib diisi` });
    }
    if (typeof candidate === "number" && spec.min !== undefined && candidate < spec.min) {
      ctx.addIssue({ code: "custom", path: ["options", spec.key], message: `Minimal ${spec.min}` });
    }
    if (typeof candidate === "number" && spec.max !== undefined && candidate > spec.max) {
      ctx.addIssue({ code: "custom", path: ["options", spec.key], message: `Maksimal ${spec.max}` });
    }
    if (spec.options && candidate !== undefined) {
      // Backward compatibility: legacy briefs stored pre-compact durations
      // ("15 detik", "30 detik", ...) must still validate against compact options.
      const legacyDurationMap: Record<string, string> = {
        "15 detik": "15s", "30 detik": "30s", "60 detik": "60s",
        "90 detik": "90s", "3 menit": "3m", "5 menit": "5m",
      };
      const normalized =
        spec.key === "duration" && typeof candidate === "string"
          ? (legacyDurationMap[candidate] ?? candidate)
          : candidate;
      if (!spec.options.includes(String(normalized))) {
        ctx.addIssue({ code: "custom", path: ["options", spec.key], message: "Pilihan tidak valid" });
      }
    }
  }
});

export type PromptBrief = z.infer<typeof promptBriefSchema>;

const legacyModes: Record<string, PromptTypeId> = {
  "Design Grafis": "product-ad", "Typography Ads": "product-ad", "9 Feed Konsisten": "content-series",
  "Carousel Feeds": "carousel", "Menu F&B": "fnb-menu", "Try-On Produk": "product-try-on",
  "Review Produk": "testimonial-review", "Copy Writing": "marketing-copy", "Video Storyboard": "video-storyboard",
  "YouTube Thumbnail": "youtube-thumbnail",
};
export function mapLegacyPromptType(mode: string): PromptTypeId | null { return legacyModes[mode] ?? null; }
export function getPromptType(id: PromptTypeId) { return launchPromptCatalog.find((item) => item.id === id)!; }
