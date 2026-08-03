"use client";

import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PERSONAL_SITE_SECTION_TYPES,
  type PersonalSiteSection,
} from "@/lib/personal-site/model";
import { useT } from "@/lib/i18n-client";
import { useConfirm } from "@/lib/hooks/use-confirm";

function id() {
  return crypto.randomUUID();
}

function emptySection(type: PersonalSiteSection["type"]): PersonalSiteSection {
  const base = { id: id(), heading: "Section" };
  switch (type) {
    case "services": return { ...base, type, items: [{ id: id(), title: "", description: "" }] };
    case "process": return { ...base, type, steps: [{ id: id(), title: "", description: "" }] };
    case "pricing": return { ...base, type, offers: [{ id: id(), name: "", price: "", description: "" }] };
    case "portfolio": return { ...base, type, projects: [{ id: id(), title: "", description: "", url: "" }] };
    case "testimonials": return { ...base, type, testimonials: [{ id: id(), quote: "", author: "", role: "" }] };
    case "faq": return { ...base, type, items: [{ id: id(), question: "", answer: "" }] };
    case "contact": return { ...base, type, methods: [{ id: id(), label: "", value: "", url: "" }] };
    case "custom": return { ...base, type, content: "" };
    case "gallery": return { ...base, type, images: [{ id: id(), url: "", alt: "" }] };
    case "embed": return { ...base, type, url: "", height: 400 };
    case "social": return { ...base, type, links: [{ id: id(), platform: "Instagram", url: "" }] };
    case "cta": return { ...base, type, text: "", buttonLabel: "", buttonUrl: "" };
    case "divider": return { ...base, type };
    case "collapsible": return { ...base, type, items: [{ id: id(), title: "", content: "" }] };
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>;
}

function Rows({ section, onChange }: { section: PersonalSiteSection; onChange: (section: PersonalSiteSection) => void }) {
  const { t } = useT();
  const deleteLabel = t("Hapus baris", "Delete row");
  const addLabel = t("Tambah baris", "Add row");

  if (section.type === "services") return <div className="space-y-2">{section.items.map((item) => <div key={item.id} className="grid gap-2 rounded-lg bg-background p-2 sm:grid-cols-[0.8fr_1.2fr_auto]"><Input aria-label={t("Nama layanan", "Service name")} placeholder={t("Nama layanan", "Service name")} value={item.title} onChange={(e) => onChange({ ...section, items: section.items.map((row) => row.id === item.id ? { ...row, title: e.target.value } : row) })} /><Input aria-label={t("Deskripsi layanan", "Service description")} placeholder={t("Hasil atau ruang lingkup", "Outcome or scope")} value={item.description} onChange={(e) => onChange({ ...section, items: section.items.map((row) => row.id === item.id ? { ...row, description: e.target.value } : row) })} /><IconDelete label={deleteLabel} onClick={() => onChange({ ...section, items: section.items.filter((row) => row.id !== item.id) })} /></div>)}<AddRow label={addLabel} onClick={() => onChange({ ...section, items: [...section.items, { id: id(), title: "", description: "" }] })} /></div>;

  if (section.type === "process") return <div className="space-y-2">{section.steps.map((step) => <div key={step.id} className="grid gap-2 rounded-lg bg-background p-2 sm:grid-cols-[0.8fr_1.2fr_auto]"><Input aria-label={t("Judul langkah", "Step title")} placeholder={t("Judul langkah", "Step title")} value={step.title} onChange={(e) => onChange({ ...section, steps: section.steps.map((row) => row.id === step.id ? { ...row, title: e.target.value } : row) })} /><Input aria-label={t("Deskripsi langkah", "Step description")} placeholder={t("Apa yang terjadi", "What happens")} value={step.description} onChange={(e) => onChange({ ...section, steps: section.steps.map((row) => row.id === step.id ? { ...row, description: e.target.value } : row) })} /><IconDelete label={deleteLabel} onClick={() => onChange({ ...section, steps: section.steps.filter((row) => row.id !== step.id) })} /></div>)}<AddRow label={addLabel} onClick={() => onChange({ ...section, steps: [...section.steps, { id: id(), title: "", description: "" }] })} /></div>;

  if (section.type === "pricing") return <div className="space-y-2">{section.offers.map((offer) => <div key={offer.id} className="grid gap-2 rounded-lg bg-background p-2 sm:grid-cols-[0.8fr_0.5fr_1fr_auto]"><Input aria-label={t("Nama penawaran", "Offer name")} placeholder={t("Nama paket", "Package name")} value={offer.name} onChange={(e) => onChange({ ...section, offers: section.offers.map((row) => row.id === offer.id ? { ...row, name: e.target.value } : row) })} /><Input aria-label={t("Harga", "Price")} placeholder="Rp..., $..., Custom" value={offer.price} onChange={(e) => onChange({ ...section, offers: section.offers.map((row) => row.id === offer.id ? { ...row, price: e.target.value } : row) })} /><Input aria-label={t("Deskripsi penawaran", "Offer description")} placeholder={t("Cakupan singkat", "Short scope")} value={offer.description} onChange={(e) => onChange({ ...section, offers: section.offers.map((row) => row.id === offer.id ? { ...row, description: e.target.value } : row) })} /><IconDelete label={deleteLabel} onClick={() => onChange({ ...section, offers: section.offers.filter((row) => row.id !== offer.id) })} /></div>)}<AddRow label={addLabel} onClick={() => onChange({ ...section, offers: [...section.offers, { id: id(), name: "", price: "", description: "" }] })} /></div>;

  if (section.type === "portfolio") return <div className="space-y-2">{section.projects.map((project) => <div key={project.id} className="grid gap-2 rounded-lg bg-background p-2 sm:grid-cols-2"><Input aria-label={t("Nama proyek", "Project name")} placeholder={t("Nama proyek", "Project name")} value={project.title} onChange={(e) => onChange({ ...section, projects: section.projects.map((row) => row.id === project.id ? { ...row, title: e.target.value } : row) })} /><Input aria-label={t("URL proyek", "Project URL")} placeholder="https://..." value={project.url} onChange={(e) => onChange({ ...section, projects: section.projects.map((row) => row.id === project.id ? { ...row, url: e.target.value } : row) })} /><Textarea className="sm:col-span-1" aria-label={t("Deskripsi proyek", "Project description")} placeholder={t("Masalah, kontribusi, hasil nyata", "Problem, contribution, real outcome")} value={project.description} onChange={(e) => onChange({ ...section, projects: section.projects.map((row) => row.id === project.id ? { ...row, description: e.target.value } : row) })} /><IconDelete className="self-end justify-self-end" label={deleteLabel} onClick={() => onChange({ ...section, projects: section.projects.filter((row) => row.id !== project.id) })} /></div>)}<AddRow label={addLabel} onClick={() => onChange({ ...section, projects: [...section.projects, { id: id(), title: "", description: "", url: "" }] })} /></div>;

  if (section.type === "testimonials") return <div className="space-y-2">{section.testimonials.map((item) => <div key={item.id} className="grid gap-2 rounded-lg bg-background p-2 sm:grid-cols-2"><Textarea className="sm:col-span-2" aria-label={t("Kutipan", "Quote")} placeholder={t("Masukkan testimoni asli", "Add a real testimonial")} value={item.quote} onChange={(e) => onChange({ ...section, testimonials: section.testimonials.map((row) => row.id === item.id ? { ...row, quote: e.target.value } : row) })} /><Input aria-label={t("Nama pemberi testimoni", "Testimonial author")} placeholder={t("Nama asli", "Real name")} value={item.author} onChange={(e) => onChange({ ...section, testimonials: section.testimonials.map((row) => row.id === item.id ? { ...row, author: e.target.value } : row) })} /><div className="flex gap-2"><Input aria-label={t("Peran", "Role")} placeholder={t("Peran / perusahaan", "Role / company")} value={item.role} onChange={(e) => onChange({ ...section, testimonials: section.testimonials.map((row) => row.id === item.id ? { ...row, role: e.target.value } : row) })} /><IconDelete label={deleteLabel} onClick={() => onChange({ ...section, testimonials: section.testimonials.filter((row) => row.id !== item.id) })} /></div></div>)}<AddRow label={addLabel} onClick={() => onChange({ ...section, testimonials: [...section.testimonials, { id: id(), quote: "", author: "", role: "" }] })} /></div>;

  if (section.type === "faq") return <div className="space-y-2">{section.items.map((item) => <div key={item.id} className="grid gap-2 rounded-lg bg-background p-2 sm:grid-cols-[1fr_1.4fr_auto]"><Input aria-label={t("Pertanyaan", "Question")} placeholder={t("Pertanyaan", "Question")} value={item.question} onChange={(e) => onChange({ ...section, items: section.items.map((row) => row.id === item.id ? { ...row, question: e.target.value } : row) })} /><Textarea aria-label={t("Jawaban", "Answer")} placeholder={t("Jawaban", "Answer")} value={item.answer} onChange={(e) => onChange({ ...section, items: section.items.map((row) => row.id === item.id ? { ...row, answer: e.target.value } : row) })} /><IconDelete label={deleteLabel} onClick={() => onChange({ ...section, items: section.items.filter((row) => row.id !== item.id) })} /></div>)}<AddRow label={addLabel} onClick={() => onChange({ ...section, items: [...section.items, { id: id(), question: "", answer: "" }] })} /></div>;

  if (section.type === "contact") return <div className="space-y-2">{section.methods.map((method) => <div key={method.id} className="grid gap-2 rounded-lg bg-background p-2 sm:grid-cols-[0.6fr_0.8fr_1.2fr_auto]"><Input aria-label={t("Label kontak", "Contact label")} placeholder="Email / WhatsApp" value={method.label} onChange={(e) => onChange({ ...section, methods: section.methods.map((row) => row.id === method.id ? { ...row, label: e.target.value } : row) })} /><Input aria-label={t("Nilai kontak", "Contact value")} placeholder="hello@..." value={method.value} onChange={(e) => onChange({ ...section, methods: section.methods.map((row) => row.id === method.id ? { ...row, value: e.target.value } : row) })} /><Input aria-label={t("URL kontak", "Contact URL")} placeholder="mailto:, tel:, https://" value={method.url} onChange={(e) => onChange({ ...section, methods: section.methods.map((row) => row.id === method.id ? { ...row, url: e.target.value } : row) })} /><IconDelete label={deleteLabel} onClick={() => onChange({ ...section, methods: section.methods.filter((row) => row.id !== method.id) })} /></div>)}<AddRow label={addLabel} onClick={() => onChange({ ...section, methods: [...section.methods, { id: id(), label: "", value: "", url: "" }] })} /></div>;

  if (section.type === "gallery") return <div className="space-y-2">{section.images.map((img) => <div key={img.id} className="grid gap-2 rounded-lg bg-background p-2 sm:grid-cols-[1fr_0.5fr_auto]"><Input aria-label={t("URL gambar", "Image URL")} placeholder="https://..." value={img.url} onChange={(e) => onChange({ ...section, images: section.images.map((row) => row.id === img.id ? { ...row, url: e.target.value } : row) })} /><Input aria-label={t("Alt text", "Alt text")} placeholder={t("Deskripsi singkat", "Short description")} value={img.alt ?? ""} onChange={(e) => onChange({ ...section, images: section.images.map((row) => row.id === img.id ? { ...row, alt: e.target.value } : row) })} /><IconDelete label={deleteLabel} onClick={() => onChange({ ...section, images: section.images.filter((row) => row.id !== img.id) })} /></div>)}<AddRow label={addLabel} onClick={() => onChange({ ...section, images: [...section.images, { id: id(), url: "", alt: "" }] })} /></div>;

  if (section.type === "embed") return <div className="space-y-2"><Field label={t("URL embed", "Embed URL")}><Input placeholder="https://youtube.com/watch?v=..." value={section.url} onChange={(e) => onChange({ ...section, url: e.target.value })} /></Field><Field label={t("Tinggi (px)", "Height (px)")}><Input type="number" min={100} max={800} value={section.height ?? 400} onChange={(e) => onChange({ ...section, height: Number(e.target.value) })} /></Field></div>;

  if (section.type === "social") {
    const platforms = ["Instagram", "TikTok", "LinkedIn", "Twitter/X", "YouTube", "Facebook", "WhatsApp", "GitHub", "Dribbble", "Behance"];
    return <div className="space-y-2">{section.links.map((link) => <div key={link.id} className="grid gap-2 rounded-lg bg-background p-2 sm:grid-cols-[0.6fr_1fr_auto]"><Select value={link.platform} onValueChange={(v) => onChange({ ...section, links: section.links.map((row) => row.id === link.id ? { ...row, platform: v } : row) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{platforms.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><Input aria-label={t("URL profil", "Profile URL")} placeholder="https://..." value={link.url} onChange={(e) => onChange({ ...section, links: section.links.map((row) => row.id === link.id ? { ...row, url: e.target.value } : row) })} /><IconDelete label={deleteLabel} onClick={() => onChange({ ...section, links: section.links.filter((row) => row.id !== link.id) })} /></div>)}<AddRow label={addLabel} onClick={() => onChange({ ...section, links: [...section.links, { id: id(), platform: "Instagram", url: "" }] })} /></div>;
  }

  if (section.type === "cta") return <div className="space-y-3"><Field label={t("Teks", "Text")}><Textarea rows={3} placeholder={t("Teks ajakan...", "Call to action text...")} value={section.text} onChange={(e) => onChange({ ...section, text: e.target.value })} /></Field><div className="grid gap-2 sm:grid-cols-2"><Field label={t("Label tombol", "Button label")}><Input placeholder={t("Hubungi saya", "Contact me")} value={section.buttonLabel} onChange={(e) => onChange({ ...section, buttonLabel: e.target.value })} /></Field><Field label={t("URL tombol", "Button URL")}><Input placeholder="https://..." value={section.buttonUrl} onChange={(e) => onChange({ ...section, buttonUrl: e.target.value })} /></Field></div></div>;

  if (section.type === "divider") return <p className="text-xs text-muted-foreground">{t("Garis pemisah akan muncul di halaman publik.", "A divider line will appear on the public page.")}</p>;

  if (section.type === "collapsible") return <div className="space-y-2">{section.items.map((item) => <div key={item.id} className="space-y-2 rounded-lg bg-background p-2"><Input aria-label={t("Judul", "Title")} placeholder={t("Judul accordion", "Accordion title")} value={item.title} onChange={(e) => onChange({ ...section, items: section.items.map((row) => row.id === item.id ? { ...row, title: e.target.value } : row) })} /><Textarea aria-label={t("Isi", "Content")} placeholder={t("Isi konten", "Content")} value={item.content} onChange={(e) => onChange({ ...section, items: section.items.map((row) => row.id === item.id ? { ...row, content: e.target.value } : row) })} /><IconDelete label={deleteLabel} onClick={() => onChange({ ...section, items: section.items.filter((row) => row.id !== item.id) })} /></div>)}<AddRow label={addLabel} onClick={() => onChange({ ...section, items: [...section.items, { id: id(), title: "", content: "" }] })} /></div>;

  return <Textarea aria-label={t("Isi section", "Section content")} rows={5} placeholder={t("Tulis isi section", "Write section content")} value={"content" in section ? section.content : ""} onChange={(e) => onChange({ ...section, content: e.target.value } as PersonalSiteSection)} />;
}

function IconDelete({ label, onClick, className = "" }: { label: string; onClick: () => void; className?: string }) {
  return <Button type="button" variant="ghost" size="icon" className={`h-10 w-10 text-destructive ${className}`} aria-label={label} onClick={onClick}><Trash2 className="h-4 w-4" /></Button>;
}
function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button type="button" variant="outline" size="sm" className="min-h-10" onClick={onClick}><Plus className="h-4 w-4" />{label}</Button>;
}

export function SectionEditor({ sections, onChange }: { sections: PersonalSiteSection[]; onChange: (sections: PersonalSiteSection[]) => void }) {
  const { t } = useT();
  const { confirm, dialog } = useConfirm();
  const update = (idValue: string, next: PersonalSiteSection) => onChange(sections.map((section) => section.id === idValue ? next : section));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const remove = (section: PersonalSiteSection) => {
    const run = async () => {
      if (JSON.stringify(section).length > 160) {
        const ok = await confirm({
          title: t("Hapus section?", "Delete section?"),
          description: t("Hapus section beserta isinya?", "Delete this section and its content?"),
          confirmLabel: t("Hapus", "Delete"),
          destructive: true,
        });
        if (!ok) return;
      }
      onChange(sections.filter((item) => item.id !== section.id));
    };
    run();
  };
  const duplicate = (section: PersonalSiteSection) => onChange([...sections.slice(0, sections.indexOf(section) + 1), { ...structuredClone(section), id: id(), heading: `${section.heading} (${t("salinan", "copy")})` }, ...sections.slice(sections.indexOf(section) + 1)]);
  const add = () => onChange([...sections, emptySection("custom")]);

  return <div className="space-y-3">
    <div className="flex items-center justify-between"><div><h3 className="font-semibold">{t("Section", "Sections")}</h3><p className="text-xs text-muted-foreground">{t("Maksimal 12 section. Tipe menentukan tampilan publik.", "Up to 12 sections. Type controls public layout.")}</p></div>{sections.length === 0 && <AddRow label={t("Tambah section", "Add section")} onClick={add} />}</div>
    {sections.map((section, index) => <div key={section.id} className="space-y-3 rounded-xl bg-muted/35 p-3 sm:p-4">
      <div className="grid gap-2 sm:grid-cols-[150px_1fr_auto]">
        <Select value={section.type} onValueChange={(value) => {
          const run = async () => {
            const ok = await confirm({
              title: t("Ganti tipe section?", "Change section type?"),
              description: t("Ganti tipe akan mereset isi section ini. Lanjut?", "Changing type resets this section. Continue?"),
              confirmLabel: t("Lanjut", "Continue"),
            });
            if (!ok) return;
            const replacement = emptySection(value as PersonalSiteSection["type"]);
            update(section.id, { ...replacement, id: section.id, heading: section.heading } as PersonalSiteSection);
          };
          run();
        }}><SelectTrigger className="min-h-10"><SelectValue /></SelectTrigger><SelectContent>{PERSONAL_SITE_SECTION_TYPES.map((type) => <SelectItem key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</SelectItem>)}</SelectContent></Select>
        <Input aria-label={t("Judul section", "Section heading")} placeholder={t("Judul section", "Section heading")} value={section.heading} onChange={(e) => update(section.id, { ...section, heading: e.target.value })} />
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10" aria-label={t("Naikkan section", "Move section up")} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10" aria-label={t("Turunkan section", "Move section down")} disabled={index === sections.length - 1} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10" aria-label={t("Duplikat section", "Duplicate section")} onClick={() => duplicate(section)}><Copy className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive" aria-label={t("Hapus section", "Delete section")} onClick={() => remove(section)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <Rows section={section} onChange={(next) => update(section.id, next)} />
    </div>)}
    {sections.length > 0 && sections.length < 12 && <AddRow label={t("Tambah section", "Add section")} onClick={add} />}
  </div>;
}
