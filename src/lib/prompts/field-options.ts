/** Shared dropdown options for prompt studio fields. */

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
