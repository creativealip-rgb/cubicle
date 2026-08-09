/** Shared dropdown options for prompt studio fields. */

/**
 * Labels for compact/internal option values (face, no-face, short, medium,
 * long, yes, no, 3m, biweekly, ...). The form displays these labels and never
 * exposes the raw internal values. Keys are the raw stored values.
 */
export const optionLabels: Record<string, { id: string; en: string }> = {
  // YouTube thumbnail — face
  "face": { id: "Tampilkan wajah", en: "Show face" },
  "no-face": { id: "Tanpa wajah", en: "No face" },
  // Marketing copy / article — length
  "short": { id: "Pendek", en: "Short" },
  "medium": { id: "Sedang", en: "Medium" },
  "long": { id: "Panjang", en: "Long" },
  // F&B menu — show price
  "yes": { id: "Ya", en: "Yes" },
  "no": { id: "Tidak", en: "No" },
  // Duration
  "15s": { id: "15 detik", en: "15 seconds" },
  "30s": { id: "30 detik", en: "30 seconds" },
  "60s": { id: "60 detik", en: "60 seconds" },
  "90s": { id: "90 detik", en: "90 seconds" },
  "3m": { id: "3 menit", en: "3 minutes" },
  "5m": { id: "5 menit", en: "5 minutes" },
  // Content series cadence
  "daily": { id: "Harian", en: "Daily" },
  "every 2 days": { id: "Setiap 2 hari", en: "Every 2 days" },
  "weekly": { id: "Mingguan", en: "Weekly" },
  "biweekly": { id: "2 minggu sekali", en: "Every 2 weeks" },
  // Short video script — presenter format
  "presenter": { id: "Presenter di depan kamera", en: "On-camera presenter" },
  "faceless": { id: "Tanpa wajah (voice-over)", en: "Faceless (voice-over)" },
};

/** Indonesian label for a raw option value, falling back to the raw value. */
export function optionLabelId(value: string): string {
  return optionLabels[value]?.id ?? value;
}

/** English label for a raw option value, falling back to the raw value. */
export function optionLabelEn(value: string): string {
  return optionLabels[value]?.en ?? value;
}

/**
 * Option descriptors for select fields whose raw values must never be shown
 * in the UI (face/no-face, short/medium/long, yes/no, 3m, biweekly, ...).
 * Use `options` (raw values) plus `optionLabels` in the UI; these tuples are
 * the source of truth for the label lookup map above.
 */
export const labeledOptions: Record<string, readonly { value: string; labelId: string; labelEn: string }[]> = {
  face: [
    { value: "face", labelId: "Tampilkan wajah", labelEn: "Show face" },
    { value: "no-face", labelId: "Tanpa wajah", labelEn: "No face" },
  ],
  length: [
    { value: "short", labelId: "Pendek", labelEn: "Short" },
    { value: "medium", labelId: "Sedang", labelEn: "Medium" },
    { value: "long", labelId: "Panjang", labelEn: "Long" },
  ],
  showPrice: [
    { value: "yes", labelId: "Ya", labelEn: "Yes" },
    { value: "no", labelId: "Tidak", labelEn: "No" },
  ],
  presentation: [
    { value: "presenter", labelId: "Presenter di depan kamera", labelEn: "On-camera presenter" },
    { value: "faceless", labelId: "Tanpa wajah (voice-over)", labelEn: "Faceless (voice-over)" },
  ],
  duration: [
    { value: "15s", labelId: "15 detik", labelEn: "15 seconds" },
    { value: "30s", labelId: "30 detik", labelEn: "30 seconds" },
    { value: "60s", labelId: "60 detik", labelEn: "60 seconds" },
    { value: "90s", labelId: "90 detik", labelEn: "90 seconds" },
    { value: "3m", labelId: "3 menit", labelEn: "3 minutes" },
    { value: "5m", labelId: "5 menit", labelEn: "5 minutes" },
  ],
  cadence: [
    { value: "daily", labelId: "Harian", labelEn: "Daily" },
    { value: "every 2 days", labelId: "Setiap 2 hari", labelEn: "Every 2 days" },
    { value: "weekly", labelId: "Mingguan", labelEn: "Weekly" },
    { value: "biweekly", labelId: "2 minggu sekali", labelEn: "Every 2 weeks" },
  ],
};

export const toneOptions = [
  "Professional", "Casual", "Friendly", "Humorous", "Bold",
  "Elegant", "Minimalist", "Warm", "Inspirational", "Urgent",
] as const;

export const styleOptions = [
  "Minimal Clean", "Luxury Premium", "Dark Neon", "Bold & Colorful",
  "Corporate Professional", "Bright & Fresh", "Warm & Cozy", "Futuristic Tech",
  "Retro Vintage", "Playful Fun",
] as const;

export const platformOptions = [
  "Instagram", "TikTok", "Facebook", "LinkedIn", "YouTube",
  "Twitter/X", "WhatsApp", "Website", "Shopee", "Tokopedia",
] as const;

export const ratioOptions = [
  "1:1 (Square)", "4:5 (Portrait Feed)", "9:16 (Story/Reels/TikTok)",
  "16:9 (Landscape/Web)", "21:9 (Ultrawide Hero)",
] as const;

export const sceneOptions = [
  "Studio White", "Studio Dark", "Lifestyle", "Outdoor / Nature",
  "Kitchen", "Bathroom", "Street / Urban", "Cafe / Restaurant",
  "Office / Workspace", "Flat Lay",
] as const;

export const cameraAngleOptions = [
  "Eye Level", "Low Angle", "High Angle", "Bird's Eye / Top-Down",
  "Overhead / Flat Lay", "Close-Up / Macro", "Dutch Angle",
] as const;

export const lightingOptions = [
  "Soft Lighting", "Neon Glow", "Dramatic Shadow", "Studio Light",
  "Natural Sunlight", "Ring Light", "Golden Hour", "Backlit / Silhouette",
] as const;

export const backgroundOptions = [
  "White / Minimal", "Gradient", "Natural / Outdoor", "Urban / Street",
  "Textured / Solid Color", "Bokeh / Blurred", "Dark / Moody",
] as const;

export const orientationOptions = [
  "Portrait", "Landscape", "Square",
] as const;

export const voiceLanguageOptions = [
  "Indonesia", "English", "Mixed (ID + EN)",
] as const;

export const durationOptions = [
  "15s", "30s", "60s", "90s", "3m", "5m",
] as const;

export const cadenceOptions = [
  "daily", "every 2 days", "weekly", "biweekly",
] as const;
