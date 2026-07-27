import { z } from "zod";

export const promptTypeIds = [
  "instagram-feed", "carousel", "story", "content-series", "product-ad",
  "promo-discount", "testimonial-review", "product-photography", "product-try-on",
  "fnb-menu", "short-video-script", "video-storyboard", "ugc-ad",
  "youtube-thumbnail", "marketing-copy",
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
  entry("instagram-feed", "social-media", "Feed Instagram", "Konsep visual, caption, CTA, dan hashtag siap posting.", "instagram", [field("platform", "Platform"), field("ratio", "Rasio"), field("tone", "Tone")], ["Konsep visual", "Prompt gambar", "Overlay", "Caption", "CTA", "Hashtag"], { platform: "Instagram", ratio: "4:5" }),
  entry("carousel", "social-media", "Carousel", "Konten 3–10 slide dengan copy dan arahan visual.", "panels-top-left", [field("slideCount", "Jumlah slide", "number", { required: true, min: 3, max: 10 }), field("intent", "Intent", "select", { required: true, options: ["educational", "promotional"] })], ["Struktur slide", "Copy per slide", "Arahan visual", "Caption", "CTA"], { slideCount: 5, intent: "educational" }),
  entry("story", "social-media", "Story", "Story 1–5 frame dengan interaksi dan CTA.", "smartphone", [field("frameCount", "Jumlah frame", "number", { required: true, min: 1, max: 5 }), field("interactionType", "Interaksi", "select", { required: true, options: ["poll", "question", "quiz", "none"] })], ["Frame", "Headline", "Arahan visual", "Interaksi", "CTA"], { frameCount: 3, interactionType: "poll", ratio: "9:16" }),
  entry("content-series", "social-media", "Content Series", "Campaign 3, 6, atau 9 post yang konsisten.", "layout-grid", [field("postCount", "Jumlah post", "select", { required: true, options: ["3", "6", "9"] }), field("cadence", "Jadwal terbit", "text", { required: true })], ["Peran setiap post", "Sistem visual", "Caption", "Saran jadwal"], { postCount: 3, cadence: "weekly" }),
  entry("product-ad", "ads-promotion", "Iklan Produk", "Materi iklan produk fokus konversi.", "badge-megaphone", [field("offer", "Penawaran"), field("placement", "Placement", "text", { required: true }), field("ratio", "Rasio", "text", { required: true })], ["Headline", "Subheadline", "Prompt visual", "Offer", "CTA", "Negative prompt"]),
  entry("promo-discount", "ads-promotion", "Promo & Diskon", "Promo dengan hierarki harga dan urgensi jelas.", "badge-percent", [field("normalPrice", "Harga normal"), field("promoPrice", "Harga promo"), field("period", "Periode"), field("terms", "Syarat")], ["Hierarki harga", "Badge promo", "Urgency copy", "CTA", "Layout"]),
  entry("testimonial-review", "ads-promotion", "Testimonial & Review", "Ubah bukti nyata menjadi materi review kredibel.", "message-square-quote", [field("proofSource", "Kutipan / sumber bukti", "textarea"), field("rating", "Rating"), field("context", "Konteks produk / layanan", "textarea", { required: true })], ["Proof angle", "Hierarki kutipan", "Layout review", "Supporting copy", "CTA"]),
  entry("product-photography", "product", "Product Photography", "Brief foto produk dengan kamera dan lighting terarah.", "camera", [field("scene", "Scene", "text", { required: true }), field("cameraAngle", "Sudut kamera", "text", { required: true }), field("lighting", "Lighting", "text", { required: true }), field("background", "Background", "text", { required: true })], ["Scene", "Camera", "Lighting", "Background", "Product treatment", "Negative prompt"]),
  entry("product-try-on", "product", "Product Try-On", "Visual model memakai produk secara konsisten.", "shirt", [field("productCategory", "Kategori produk", "text", { required: true }), field("modelProfile", "Profil model", "textarea", { required: true }), field("pose", "Pose", "text", { required: true }), field("styling", "Styling", "textarea", { required: true })], ["Profil model", "Pose", "Styling", "Product placement", "Camera", "Consistency notes"]),
  entry("fnb-menu", "product", "Menu F&B", "Menu dengan foto makanan dan hierarki harga.", "utensils", [field("menuName", "Nama item / menu", "text", { required: true }), field("showPrice", "Tampilkan harga", "select", { required: true, options: ["yes", "no"] }), field("mood", "Cuisine / venue mood", "text", { required: true })], ["Hierarki menu", "Prompt foto", "Copy item", "Harga", "CTA"]),
  entry("short-video-script", "video", "Short Video Script", "Script video pendek lengkap dengan shot dan overlay.", "clapperboard", [field("platform", "Platform", "text", { required: true }), field("duration", "Durasi", "text", { required: true }), field("presentation", "Format presenter", "select", { required: true, options: ["presenter", "faceless"] }), field("tone", "Tone", "text", { required: true })], ["Hook", "Script", "Shot list", "Overlay", "B-roll", "CTA"]),
  entry("video-storyboard", "video", "Video Storyboard", "Storyboard scene-by-scene siap produksi.", "film", [field("duration", "Durasi", "text", { required: true }), field("sceneCount", "Jumlah scene", "number", { required: true, min: 1, max: 20 }), field("orientation", "Orientasi", "text", { required: true }), field("voiceLanguage", "Bahasa VO", "text", { required: true })], ["Durasi scene", "Visual", "Camera", "VO", "Overlay", "Transition", "Audio mood"]),
  entry("ugc-ad", "video", "UGC Ad", "Script UGC natural dari masalah sampai CTA.", "user-round", [field("platform", "Platform", "text", { required: true }), field("duration", "Durasi", "text", { required: true }), field("creatorProfile", "Profil kreator", "textarea", { required: true }), field("objection", "Keberatan audiens", "textarea"), field("proofAvailable", "Bukti tersedia", "textarea")], ["Natural hook", "Problem", "Demo", "Proof", "Objection handling", "CTA"]),
  entry("youtube-thumbnail", "video", "YouTube Thumbnail", "Thumbnail kuat dengan teks singkat dan kontras.", "youtube", [field("videoTopic", "Topik / judul video", "textarea", { required: true }), field("subject", "Subjek", "text", { required: true }), field("face", "Wajah", "select", { required: true, options: ["face", "no-face"] }), field("textPreference", "Preferensi teks")], ["Subject", "Expression", "Composition", "Teks 3–5 kata", "Contrast", "Negative prompt"]),
  entry("marketing-copy", "brand-copy", "Marketing Copy", "Satu format copy yang fokus dan siap dipakai.", "type", [field("copyFormat", "Format copy", "select", { required: true, options: ["caption", "ad-copy", "product-description", "headline-set", "cta-set", "broadcast-message"] }), field("length", "Panjang", "select", { required: true, options: ["short", "medium", "long"] }), field("channel", "Channel", "text", { required: true }), field("tone", "Tone")], ["Copy final", "CTA"]),
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
