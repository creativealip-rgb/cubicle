import { z } from "zod";
import {
  toneOptions, styleOptions, platformOptions, ratioOptions,
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
  description: string;
  iconKey: string;
  defaults: Record<string, PromptOptionValue>;
  fields: PromptFieldDefinition[];
  outputContract: readonly string[];
};

const field = (key: string, label: string, type: PromptFieldDefinition["type"] = "text", extra: Partial<PromptFieldDefinition> = {}): PromptFieldDefinition => ({ key, label, type, ...extra });
const entry = (id: PromptTypeId, category: PromptCategory, name: string, description: string, iconKey: string, fields: PromptFieldDefinition[], outputContract: string[], defaults: Record<string, PromptOptionValue> = {}): PromptCatalogEntry => ({ id, category, name, description, iconKey, fields, outputContract, defaults });

export const launchPromptCatalog: PromptCatalogEntry[] = [
  entry("instagram-feed", "social-media", "Feed", "Konsep visual, caption, CTA, dan hashtag siap posting.", "instagram", [
    field("platform", "Platform", "select", { options: [...platformOptions] }),
    field("ratio", "Rasio", "select", { options: [...ratioOptions] }),
    field("tone", "Tone", "select", { options: [...toneOptions] }),
  ], ["Konsep visual", "Prompt gambar", "Overlay", "Caption", "CTA", "Hashtag"], { ratio: "4:5 (Portrait Feed)" }),

  entry("carousel", "social-media", "Carousel", "Konten 3–10 slide dengan copy dan arahan visual.", "panels-top-left", [
    field("slideCount", "Jumlah slide", "number", { required: true, min: 3, max: 10 }),
    field("intent", "Intent", "select", { required: true, options: ["educational", "promotional"] }),
  ], ["Struktur slide", "Copy per slide", "Arahan visual", "Caption", "CTA"], { slideCount: 5, intent: "educational" }),

  entry("story", "social-media", "Story", "Story 1–5 frame dengan interaksi dan CTA.", "smartphone", [
    field("frameCount", "Jumlah frame", "number", { required: true, min: 1, max: 5 }),
    field("interactionType", "Interaksi", "select", { required: true, options: ["poll", "question", "quiz", "none"] }),
  ], ["Frame", "Headline", "Arahan visual", "Interaksi", "CTA"], { frameCount: 3, interactionType: "poll", ratio: "9:16 (Story/Reels/TikTok)" }),

  entry("content-series", "social-media", "Content Series", "Campaign 3, 6, atau 9 post yang konsisten.", "layout-grid", [
    field("postCount", "Jumlah post", "select", { required: true, options: ["3", "6", "9"] }),
    field("cadence", "Jadwal terbit", "select", { required: true, options: [...cadenceOptions] }),
  ], ["Peran setiap post", "Sistem visual", "Caption", "Saran jadwal"], { postCount: 3, cadence: "weekly" }),

  entry("product-ad", "ads-promotion", "Iklan Produk", "Materi iklan produk fokus konversi.", "badge-megaphone", [
    field("offer", "Penawaran"),
    field("placement", "Placement", "select", { required: true, options: [...platformOptions] }),
    field("ratio", "Rasio", "select", { required: true, options: [...ratioOptions] }),
  ], ["Headline", "Subheadline", "Prompt visual", "Offer", "CTA", "Negative prompt"]),

  entry("promo-discount", "ads-promotion", "Promo & Diskon", "Promo dengan hierarki harga dan urgensi jelas.", "badge-percent", [
    field("normalPrice", "Harga normal"),
    field("promoPrice", "Harga promo"),
    field("period", "Periode"),
    field("terms", "Syarat"),
  ], ["Hierarki harga", "Badge promo", "Urgency copy", "CTA", "Layout"]),

  entry("testimonial-review", "ads-promotion", "Testimonial & Review", "Ubah bukti nyata menjadi materi review kredibel.", "message-square-quote", [
    field("proofSource", "Kutipan / sumber bukti", "textarea"),
    field("rating", "Rating"),
    field("context", "Konteks produk / layanan", "textarea", { required: true }),
  ], ["Proof angle", "Hierarki kutipan", "Layout review", "Supporting copy", "CTA"]),

  entry("product-photography", "product", "Product Photography", "Brief foto produk dengan kamera dan lighting terarah.", "camera", [
    field("scene", "Scene", "select", { required: true, options: [...sceneOptions] }),
    field("cameraAngle", "Sudut kamera", "select", { required: true, options: [...cameraAngleOptions] }),
    field("lighting", "Lighting", "select", { required: true, options: [...lightingOptions] }),
    field("background", "Background", "select", { required: true, options: [...backgroundOptions] }),
  ], ["Scene", "Camera", "Lighting", "Background", "Product treatment", "Negative prompt"]),

  entry("product-try-on", "product", "Product Try-On", "Visual model memakai produk secara konsisten.", "shirt", [
    field("productCategory", "Kategori produk", "text", { required: true }),
    field("modelProfile", "Profil model", "textarea", { required: true }),
    field("pose", "Pose", "select", { required: true, options: ["Standing / Berdiri", "Sitting / Duduk", "Walking / Jalan", "Action / Aktivitas", "Close-Up Detail", "Lifestyle / Natural"] }),
    field("styling", "Styling", "textarea", { required: true }),
  ], ["Profil model", "Pose", "Styling", "Product placement", "Camera", "Consistency notes"]),

  entry("fnb-menu", "product", "Menu F&B", "Menu dengan foto makanan dan hierarki harga.", "utensils", [
    field("menuName", "Nama item / menu", "text", { required: true }),
    field("showPrice", "Tampilkan harga", "select", { required: true, options: ["yes", "no"] }),
    field("mood", "Cuisine / venue mood", "select", { required: true, options: ["Casual & Fun", "Elegant & Premium", "Rustic & Warm", "Modern & Minimal", "Traditional / Heritage", "Street Food / Urban"] }),
  ], ["Hierarki menu", "Prompt foto", "Copy item", "Harga", "CTA"]),

  entry("short-video-script", "video", "Short Video Script", "Script video pendek lengkap dengan shot dan overlay.", "clapperboard", [
    field("platform", "Platform", "select", { required: true, options: [...platformOptions] }),
    field("duration", "Durasi", "select", { required: true, options: [...durationOptions] }),
    field("presentation", "Format presenter", "select", { required: true, options: ["presenter", "faceless"] }),
    field("tone", "Tone", "select", { required: true, options: [...toneOptions] }),
  ], ["Hook", "Script", "Shot list", "Overlay", "B-roll", "CTA"]),

  entry("video-storyboard", "video", "Video Storyboard", "Storyboard scene-by-scene siap produksi.", "film", [
    field("duration", "Durasi", "select", { required: true, options: [...durationOptions] }),
    field("sceneCount", "Jumlah scene", "number", { required: true, min: 1, max: 20 }),
    field("orientation", "Orientasi", "select", { required: true, options: [...orientationOptions] }),
    field("voiceLanguage", "Bahasa VO", "select", { required: true, options: [...voiceLanguageOptions] }),
  ], ["Durasi scene", "Visual", "Camera", "VO", "Overlay", "Transition", "Audio mood"]),

  entry("ugc-ad", "video", "UGC Ad", "Script UGC natural dari masalah sampai CTA.", "user-round", [
    field("platform", "Platform", "select", { required: true, options: [...platformOptions] }),
    field("duration", "Durasi", "select", { required: true, options: [...durationOptions] }),
    field("creatorProfile", "Profil kreator", "textarea", { required: true }),
    field("objection", "Keberatan audiens", "textarea"),
    field("proofAvailable", "Bukti tersedia", "textarea"),
  ], ["Natural hook", "Problem", "Demo", "Proof", "Objection handling", "CTA"]),

  entry("youtube-thumbnail", "video", "YouTube Thumbnail", "Thumbnail kuat dengan teks singkat dan kontras.", "youtube", [
    field("videoTopic", "Topik / judul video", "textarea", { required: true }),
    field("subject", "Subjek", "text", { required: true }),
    field("face", "Wajah", "select", { required: true, options: ["face", "no-face"] }),
    field("textPreference", "Preferensi teks"),
  ], ["Subject", "Expression", "Composition", "Teks 3–5 kata", "Contrast", "Negative prompt"]),

  entry("marketing-copy", "brand-copy", "Marketing Copy", "Satu format copy yang fokus dan siap dipakai.", "type", [
    field("copyFormat", "Format copy", "select", { required: true, options: ["caption", "ad-copy", "product-description", "headline-set", "cta-set", "broadcast-message"] }),
    field("length", "Panjang", "select", { required: true, options: ["short", "medium", "long"] }),
    field("channel", "Channel", "select", { required: true, options: [...platformOptions] }),
    field("tone", "Tone", "select", { options: [...toneOptions] }),
  ], ["Copy final", "CTA"]),

  entry("article", "brand-copy", "Artikel", "Artikel terstruktur dengan judul, isi, dan CTA siap edit.", "file-text", [
    field("topic", "Topik", "text", { required: true }),
    field("length", "Panjang", "select", { required: true, options: ["short", "medium", "long"] }),
    field("keywords", "Kata kunci", "text"),
    field("tone", "Tone", "select", { options: [...toneOptions] }),
  ], ["Judul", "Artikel", "CTA"]),

  entry("face-card", "brand-copy", "Face Card", "Analisis wajah dan rekomendasi styling untuk portrait profesional.", "scan-face", [
    field("analysisType", "Tipe analisis", "select", { required: true, options: ["Face Features", "Spectacles", "Style", "Color", "Makeup"] }),
    field("aesthetic", "Aesthetic", "select", { required: true, options: ["Editorial Magazine", "Natural Beauty", "High Fashion", "Commercial Clean", "Artistic Dramatic", "Soft Romantic"] }),
    field("backgroundTone", "Background Tone", "select", { required: true, options: ["Beige Ivory", "Cool Gray", "Warm Earth", "Pure White", "Deep Dark", "Pastel Soft"] }),
    field("typography", "Typography", "select", { options: ["Serif + Sans Hybrid", "Modern Sans", "Classic Serif", "Handwritten Script", "Bold Display"] }),
    field("colorMood", "Color Mood", "select", { options: ["Warm Tones", "Cool Tones", "Neutral Mono", "Vibrant Pop", "Muted Pastel", "High Contrast"] }),
  ], ["Analisis", "Rekomendasi styling", "Prompt visual", "Arahan fotografi", "Color palette"]),

  entry("logo", "brand-copy", "Logo", "Desain logo dan brand mockup siap pakai.", "hexagon", [
    field("logoStyle", "Gaya logo", "select", { required: true, options: ["Minimalist", "Vintage / Retro", "Modern Geometric", "Handwritten / Organic", "3D / Isometric", "Mascot / Character", "Lettermark / Monogram"] }),
    field("colorScheme", "Skema warna", "select", { required: true, options: ["Monochrome", "Two-Tone", "Vibrant Multi", "Pastel Soft", "Dark Premium", "Gradient"] }),
    field("mockupType", "Tipe mockup", "select", { options: ["Business Card", "Letterhead", "Social Media Profile", "Packaging", "Merchandise", "Website Header", "Signage"] }),
    field("industry", "Industri", "text"),
  ], ["Konsep logo", "Prompt visual", "Variasi warna", "Mockup arahan", "Tipografi"]),
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
  for (const spec of definition.fields.filter((item) => item.required)) {
    const candidate = value.options[spec.key];
    if (candidate === undefined || candidate === null || candidate === "") ctx.addIssue({ code: "custom", path: ["options", spec.key], message: `${spec.label} wajib diisi` });
    if (typeof candidate === "number" && spec.min !== undefined && candidate < spec.min) ctx.addIssue({ code: "custom", path: ["options", spec.key], message: `Minimal ${spec.min}` });
    if (typeof candidate === "number" && spec.max !== undefined && candidate > spec.max) ctx.addIssue({ code: "custom", path: ["options", spec.key], message: `Maksimal ${spec.max}` });
    if (spec.options && candidate !== undefined && !spec.options.includes(String(candidate))) ctx.addIssue({ code: "custom", path: ["options", spec.key], message: "Pilihan tidak valid" });
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
