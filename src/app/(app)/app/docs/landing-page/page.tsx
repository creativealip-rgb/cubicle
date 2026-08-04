import { getCurrentLang, createT } from "@/lib/i18n";

export default async function DocLandingPage() {
  const lang = await getCurrentLang();
  const t = createT(lang);

  return (
    <div className="min-w-0 space-y-6 max-w-3xl">
      <DocHeader title={t("Landing Page Builder", "Landing Page Builder")} />

      <Section title="1. Akses Builder">
        <p>Login ke <a href="https://app.cubiqlo.com" className="underline">app.cubiqlo.com</a> → Sidebar → <strong>Personal</strong> → <strong>Landing Page</strong></p>
      </Section>

      <Section title="2. Insert — Tambah Konten">
        <h4>Starter Blocks</h4>
        <p>Drag & drop template section ke canvas: Layanan 3 Kartu, Pricing, FAQ, CTA, Testimoni.</p>
        <h4>Widget</h4>
        <p>Klik untuk tambah: Teks, Layanan, Proses, Harga, Portofolio, Galeri, FAQ, Kontak, Sosial.</p>
        <p className="text-sm text-muted-foreground mt-1">💡 Drag template ke posisi yang diinginkan. Klik untuk tambah di akhir.</p>
      </Section>

      <Section title="3. Pages — Multi-Page">
        <p>Bikin beberapa halaman. Set halaman utama (🏠). Pindah antar halaman lewat Edit.</p>
      </Section>

      <Section title="4. Templates — Template Siap Pakai">
        <p>Ganti seluruh halaman dengan template. Filter kategori → Apply. ⚠️ Menghapus konten existing.</p>
      </Section>

      <Section title="5. Theme — Styling Visual">
        <p>8 tema preset (Midnight, Paper, Studio, Ocean, Forest, Sunset, Rose, Dark). Custom warna, font, header style, button style.</p>
      </Section>

      <Section title="6. Structure — Atur Ulang Section">
        <p>Drag & drop reorder section. Klik untuk seleksi + scroll ke canvas.</p>
      </Section>

      <Section title="7. Canvas Editor">
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Klik section untuk seleksi</li>
          <li>Klik teks untuk edit inline</li>
          <li>Toolbar: Move Up/Down, Duplicate, Delete</li>
          <li>Properties panel (kanan): edit detail + AI generator</li>
          <li>Device preview: Desktop / Tablet / Mobile</li>
          <li>Undo/Redo: Ctrl+Z / Ctrl+Shift+Z</li>
        </ul>
      </Section>

      <Section title="8. SEO">
        <p>SEO Title (max 80), Description (max 180), OG Image URL. Preview WhatsApp. Copy public link.</p>
      </Section>

      <Section title="9. Publish & Unpublish">
        <p>Cek readiness badge → klik Draft/Live → konfirmasi. URL: cubiqlo.com/site/[slug].</p>
      </Section>

      <Section title="10. Mobile Editor">
        <p>Di HP otomatis jadi step wizard: Pages → Sections → Theme → Publish.</p>
      </Section>

      <Section title="11. AI Copy Generator">
        <p>Properties panel → Generate Copy → isi brief → Generate → Apply/Discard. Support: Layanan, FAQ, CTA.</p>
      </Section>

      <Section title="12. Contact Form">
        <p>Otomatis di bagian bawah landing page. Pesan dikirim ke email owner. Rate limit 3/jam. Anti-spam.</p>
      </Section>
    </div>
  );
}

function DocHeader({ title }: { title: string }) {
  return (
    <div>
      <a href="/app/docs" className="text-sm text-muted-foreground hover:text-primary transition-colors">← Dokumentasi</a>
      <h1 className="text-2xl font-bold tracking-tight mt-1">{title}</h1>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold mb-2">{title}</h2>
      <div className="text-sm text-muted-foreground space-y-2">{children}</div>
    </div>
  );
}
