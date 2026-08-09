import { getCurrentLang } from "@/lib/i18n";
import {
  AppWindow,
  Blocks,
  LayoutTemplate,
  LayoutGrid,
  Palette,
  ListTree,
  MousePointerClick,
  Search,
  Rocket,
  Smartphone,
  Wand2,
  MessageSquareText,
} from "lucide-react";
import {
  DocsBreadcrumb,
  DocsHero,
  DocsLayout,
  DocsSection,
  DocsCallout,
  DocsInlineLink,
} from "@/components/docs/doc-shell";

const SECTIONS = [
  {
    id: "akses-builder",
    icon: AppWindow,
    title: { id: "Akses Builder", en: "Access the Builder" },
    body: {
      id: (
        <>
          Login ke <DocsInlineLink href="https://app.cubiqlo.com">app.cubiqlo.com</DocsInlineLink> → Sidebar →{" "}
          <strong>Personal</strong> → <strong>Landing Page</strong>.
        </>
      ),
      en: (
        <>
          Log in to <DocsInlineLink href="https://app.cubiqlo.com">app.cubiqlo.com</DocsInlineLink> → Sidebar →{" "}
          <strong>Personal</strong> → <strong>Landing Page</strong>.
        </>
      ),
    },
  },
  {
    id: "insert",
    icon: Blocks,
    title: { id: "Insert — Tambah Konten", en: "Insert — Add Content" },
    body: {
      id: (
        <>
          <p>
            <strong>Starter Blocks</strong> — drag &amp; drop template section ke canvas: Layanan 3 Kartu, Pricing,
            FAQ, CTA, Testimoni.
          </p>
          <p>
            <strong>Widget</strong> — klik untuk tambah: Teks, Layanan, Proses, Harga, Portofolio, Galeri, FAQ,
            Kontak, Sosial.
          </p>
          <DocsCallout variant="tip">
            Drag template ke posisi yang diinginkan. Klik untuk menambah di akhir.
          </DocsCallout>
        </>
      ),
      en: (
        <>
          <p>
            <strong>Starter Blocks</strong> — drag &amp; drop a template section onto the canvas: 3-Card Services,
            Pricing, FAQ, CTA, Testimonials.
          </p>
          <p>
            <strong>Widgets</strong> — click to add: Text, Services, Process, Pricing, Portfolio, Gallery, FAQ,
            Contact, Social.
          </p>
          <DocsCallout variant="tip">Drag a template to position it. Click to append at the end.</DocsCallout>
        </>
      ),
    },
  },
  {
    id: "pages",
    icon: LayoutGrid,
    title: { id: "Pages — Multi-Page", en: "Pages — Multi-Page" },
    body: {
      id: (
        <p>
          Bikin beberapa halaman. Set halaman utama (🏠). Pindah antar halaman lewat menu Edit.
        </p>
      ),
      en: (
        <p>
          Create multiple pages. Set a home page (🏠). Switch between pages via the Edit menu.
        </p>
      ),
    },
  },
  {
    id: "templates",
    icon: LayoutTemplate,
    title: { id: "Templates — Template Siap Pakai", en: "Templates — Ready-Made Templates" },
    body: {
      id: (
        <>
          <p>Ganti seluruh halaman dengan template. Filter kategori → Apply.</p>
          <DocsCallout variant="warning" title="Perhatian">
            Menerapkan template akan menghapus konten yang sudah ada di halaman tersebut.
          </DocsCallout>
        </>
      ),
      en: (
        <>
          <p>Replace the whole page with a template. Filter by category → Apply.</p>
          <DocsCallout variant="warning" title="Caution">
            Applying a template replaces existing content on that page.
          </DocsCallout>
        </>
      ),
    },
  },
  {
    id: "theme",
    icon: Palette,
    title: { id: "Theme — Styling Visual", en: "Theme — Visual Styling" },
    body: {
      id: (
        <p>
          8 tema preset (Midnight, Paper, Studio, Ocean, Forest, Sunset, Rose, Dark). Custom warna, font, header
          style, button style.
        </p>
      ),
      en: (
        <p>
          8 preset themes (Midnight, Paper, Studio, Ocean, Forest, Sunset, Rose, Dark). Custom colors, fonts, header
          style, button style.
        </p>
      ),
    },
  },
  {
    id: "structure",
    icon: ListTree,
    title: { id: "Structure — Atur Ulang Section", en: "Structure — Reorder Sections" },
    body: {
      id: <p>Drag &amp; drop untuk mengatur ulang section. Klik untuk seleksi + scroll ke canvas.</p>,
      en: <p>Drag &amp; drop to reorder sections. Click to select and scroll to the canvas.</p>,
    },
  },
  {
    id: "canvas-editor",
    icon: MousePointerClick,
    title: { id: "Canvas Editor", en: "Canvas Editor" },
    body: {
      id: (
        <ul className="list-disc space-y-1 pl-5">
          <li>Klik section untuk seleksi</li>
          <li>Klik teks untuk edit inline</li>
          <li>Toolbar: Move Up/Down, Duplicate, Delete</li>
          <li>Properties panel (kanan): edit detail + AI generator</li>
          <li>Device preview: Desktop / Tablet / Mobile</li>
          <li>Undo/Redo: Ctrl+Z / Ctrl+Shift+Z</li>
        </ul>
      ),
      en: (
        <ul className="list-disc space-y-1 pl-5">
          <li>Click a section to select it</li>
          <li>Click text to edit inline</li>
          <li>Toolbar: Move Up/Down, Duplicate, Delete</li>
          <li>Properties panel (right): edit details + AI generator</li>
          <li>Device preview: Desktop / Tablet / Mobile</li>
          <li>Undo/Redo: Ctrl+Z / Ctrl+Shift+Z</li>
        </ul>
      ),
    },
  },
  {
    id: "seo",
    icon: Search,
    title: { id: "SEO", en: "SEO" },
    body: {
      id: (
        <p>
          SEO Title (max 80), Description (max 180), OG Image URL. Preview WhatsApp. Copy public link.
        </p>
      ),
      en: (
        <p>
          SEO Title (max 80), Description (max 180), OG Image URL. WhatsApp preview. Copy public link.
        </p>
      ),
    },
  },
  {
    id: "publish",
    icon: Rocket,
    title: { id: "Publish & Unpublish", en: "Publish & Unpublish" },
    body: {
      id: (
        <p>
          Cek readiness badge → klik Draft/Live → konfirmasi. URL:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">cubiqlo.com/site/[slug]</code>.
        </p>
      ),
      en: (
        <p>
          Check the readiness badge → click Draft/Live → confirm. URL:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">cubiqlo.com/site/[slug]</code>.
        </p>
      ),
    },
  },
  {
    id: "mobile-editor",
    icon: Smartphone,
    title: { id: "Mobile Editor", en: "Mobile Editor" },
    body: {
      id: <p>Di HP otomatis jadi step wizard: Pages → Sections → Theme → Publish.</p>,
      en: <p>On mobile it becomes a step wizard automatically: Pages → Sections → Theme → Publish.</p>,
    },
  },
  {
    id: "ai-copy",
    icon: Wand2,
    title: { id: "AI Copy Generator", en: "AI Copy Generator" },
    body: {
      id: (
        <p>
          Properties panel → Generate Copy → isi brief → Generate → Apply/Discard. Support: Layanan, FAQ, CTA.
        </p>
      ),
      en: (
        <p>
          Properties panel → Generate Copy → fill in the brief → Generate → Apply/Discard. Supports: Services, FAQ,
          CTA.
        </p>
      ),
    },
  },
  {
    id: "contact-form",
    icon: MessageSquareText,
    title: { id: "Contact Form", en: "Contact Form" },
    body: {
      id: (
        <>
          <p>Otomatis di bagian bawah landing page. Pesan dikirim ke email owner.</p>
          <DocsCallout variant="info">Rate limit 3/jam. Anti-spam.</DocsCallout>
        </>
      ),
      en: (
        <>
          <p>Automatically placed at the bottom of the landing page. Messages go to the owner&apos;s email.</p>
          <DocsCallout variant="info">Rate limit: 3/hour. Anti-spam.</DocsCallout>
        </>
      ),
    },
  },
];

export default async function DocLandingPage() {
  const lang = await getCurrentLang();
  const content = SECTIONS.map((s) => s.body[lang]);
  const toc = SECTIONS.map((s) => ({ id: s.id, label: s.title[lang] }));

  return (
    <div className="min-w-0 space-y-5">
      <DocsBreadcrumb
        items={[
          { label: lang === "en" ? "Documentation" : "Dokumentasi", href: "/app/docs" },
          { label: lang === "en" ? "Landing Page Builder" : "Landing Page Builder" },
        ]}
      />
      <DocsHero
        icon={Blocks}
        category={lang === "en" ? "Website" : "Website"}
        title={lang === "en" ? "Landing Page Builder" : "Landing Page Builder"}
        description={lang === "en" ? "Build professional landing pages with drag & drop." : "Bikin landing page profesional dengan drag & drop."}
        readMinutes={Math.max(1, Math.round(content.join(" ").split(/\s+/).filter(Boolean).length / 200))}
      />
      <DocsLayout toc={toc} tocLabel={lang === "en" ? "Table of Contents" : "Daftar Isi"}>
        {SECTIONS.map((s) => (
          <DocsSection key={s.id} id={s.id} icon={s.icon} title={s.title[lang]}>
            {s.body[lang]}
          </DocsSection>
        ))}
      </DocsLayout>
    </div>
  );
}
