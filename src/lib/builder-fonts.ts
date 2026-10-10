/**
 * Shared typography & font styling definitions for Cubiqlo builders:
 * (Document Builder, Questionnaire / Form Builder, Personal Site Canvas)
 */

export interface FontOption {
  id: string;
  name: string;
  fontFamily: string;
  category: "sans" | "serif" | "mono" | "display";
  cssClass: string;
}

export const CUBIQLO_FONTS: FontOption[] = [
  {
    id: "inter",
    name: "Inter (Modern Sans)",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    category: "sans",
    cssClass: "font-sans",
  },
  {
    id: "plus-jakarta",
    name: "Plus Jakarta Sans (Modern Geometric)",
    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
    category: "sans",
    cssClass: "font-sans",
  },
  {
    id: "poppins",
    name: "Poppins (Clean & Friendly)",
    fontFamily: "'Poppins', sans-serif",
    category: "sans",
    cssClass: "font-sans",
  },
  {
    id: "montserrat",
    name: "Montserrat (Punchy Sans)",
    fontFamily: "'Montserrat', sans-serif",
    category: "sans",
    cssClass: "font-sans",
  },
  {
    id: "lato",
    name: "Lato (Smooth & Warm)",
    fontFamily: "'Lato', sans-serif",
    category: "sans",
    cssClass: "font-sans",
  },
  {
    id: "outfit",
    name: "Outfit (Modern Tech)",
    fontFamily: "'Outfit', sans-serif",
    category: "sans",
    cssClass: "font-sans",
  },
  {
    id: "playfair",
    name: "Playfair Display (Editorial Serif)",
    fontFamily: "'Playfair Display', Georgia, Cambria, 'Times New Roman', serif",
    category: "serif",
    cssClass: "font-serif",
  },
  {
    id: "merriweather",
    name: "Merriweather (Classic Document)",
    fontFamily: "'Merriweather', Georgia, serif",
    category: "serif",
    cssClass: "font-serif",
  },
  {
    id: "lora",
    name: "Lora (Elegant Storytelling)",
    fontFamily: "'Lora', serif",
    category: "serif",
    cssClass: "font-serif",
  },
  {
    id: "jetbrains-mono",
    name: "JetBrains Mono (Technical / Code)",
    fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, monospace",
    category: "mono",
    cssClass: "font-mono",
  },
  {
    id: "syne",
    name: "Syne (Bold Display)",
    fontFamily: "'Syne', -apple-system, sans-serif",
    category: "display",
    cssClass: "font-sans font-bold",
  },
  {
    id: "space-grotesk",
    name: "Space Grotesk (Creative Display)",
    fontFamily: "'Space Grotesk', sans-serif",
    category: "display",
    cssClass: "font-sans font-bold",
  },
];

export function getFontFamily(fontId?: string | null): string {
  if (!fontId) return CUBIQLO_FONTS[0].fontFamily;
  const found = CUBIQLO_FONTS.find((f) => f.id === fontId);
  return found ? found.fontFamily : fontId;
}
