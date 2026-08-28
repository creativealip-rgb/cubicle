import { describe, expect, it } from "vitest";
import { DEFAULT_PERSONAL_SITE } from "./model";
import { PAGE_TEMPLATES } from "./page-templates";
import { SECTION_TEMPLATES } from "./section-templates";
import { SITE_PRESETS } from "@/components/site/site-presets";

const indonesian = /\b(saya|kami|anda|kamu|layanan|proyek|klien|pertanyaan|hubungi|mulai|untuk|dengan|dari|dan|atau|cara kerja|paket|harga|kebutuhan|bagian|gambar|tahun|apakah|berapa|bagaimana)\b/i;

function content(value: unknown): string {
  return JSON.stringify(value);
}

describe("personal-site English defaults", () => {
  it("uses English for the base site", () => {
    expect(content(DEFAULT_PERSONAL_SITE)).not.toMatch(indonesian);
  });

  it("uses English for every starter preset", () => {
    for (const preset of SITE_PRESETS) expect(content(preset)).not.toMatch(indonesian);
  });

  it("uses English for every section and page template", () => {
    for (const template of SECTION_TEMPLATES) expect(content({ ...template, build: template.build() })).not.toMatch(indonesian);
    for (const template of PAGE_TEMPLATES) expect(content({ ...template, build: template.build(DEFAULT_PERSONAL_SITE) })).not.toMatch(indonesian);
  });
});
