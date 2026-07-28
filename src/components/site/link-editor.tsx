"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PersonalSiteLink } from "@/lib/personal-site/model";
import { useT } from "@/lib/i18n-client";

export function LinkEditor({ links, onChange }: { links: PersonalSiteLink[]; onChange: (links: PersonalSiteLink[]) => void }) {
  const { t } = useT();
  const update = (id: string, patch: Partial<PersonalSiteLink>) => onChange(links.map((link) => link.id === id ? { ...link, ...patch } : link));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const add = () => onChange([...links, { id: crypto.randomUUID(), label: "", url: "" }]);

  return <div className="space-y-3">
    <div className="flex items-center justify-between"><div><h3 className="font-semibold">{t("Tautan", "Links")}</h3><p className="text-xs text-muted-foreground">{t("Maksimal 8 tautan publik.", "Up to 8 public links.")}</p></div><Button type="button" variant="outline" size="sm" className="min-h-10" onClick={add} disabled={links.length >= 8}><Plus className="h-4 w-4" />{t("Tambah", "Add")}</Button></div>
    {links.length === 0 && <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">{t("Belum ada tautan. Tambahkan portfolio, email, WhatsApp, atau booking.", "No links yet. Add portfolio, email, WhatsApp, or booking.")}</p>}
    {links.map((link, index) => <div key={link.id} className="grid gap-2 rounded-xl bg-muted/30 p-3 sm:grid-cols-[0.7fr_1.3fr_auto]">
      <Input aria-label={t("Label tautan", "Link label")} placeholder={t("Portfolio", "Portfolio")} value={link.label} onChange={(event) => update(link.id, { label: event.target.value })} />
      <Input aria-label={t("URL tautan", "Link URL")} placeholder="https://, mailto:, tel:, /booking/..." value={link.url} onChange={(event) => update(link.id, { url: event.target.value })} />
      <div className="flex gap-1">
        <Button type="button" variant="ghost" size="icon" className="h-10 w-10" aria-label={t("Naikkan tautan", "Move link up")} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className="h-10 w-10" aria-label={t("Turunkan tautan", "Move link down")} disabled={index === links.length - 1} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive" aria-label={t("Hapus tautan", "Delete link")} onClick={() => onChange(links.filter((item) => item.id !== link.id))}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>)}
  </div>;
}
