"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";
import type { CategoryOption } from "./expense-form";

interface ExpenseFiltersProps {
  month: string;
  categoryId: string;
  q: string;
  categories: CategoryOption[];
}

const ALL = "__all__";

function monthOptions(center: string) {
  // center = YYYY-MM; produce ±12 months
  const [y, m] = center.split("-").map(Number);
  const opts: string[] = [];
  for (let i = -12; i <= 3; i++) {
    const d = new Date(y, m - 1 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    opts.push(key);
  }
  return opts;
}

function labelMonth(key: string, locale: string) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

export function ExpenseFilters({ month, categoryId, q, categories }: ExpenseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t, locale } = useT();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(q);

  function push(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v) params.delete(k);
      else params.set(k, v);
    }
    // reset page when filters change
    if (!("page" in next)) params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    push({ q: search.trim() || undefined });
  }

  const months = monthOptions(month);

  return (
    <div className={`flex flex-col sm:flex-row gap-2 ${pending ? "opacity-70" : ""}`}>
      <Select value={month} onValueChange={(v) => push({ month: v })}>
        <SelectTrigger className="h-9 w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m} value={m}>{labelMonth(m, locale)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={categoryId || ALL}
        onValueChange={(v) => push({ categoryId: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="h-9 w-full sm:w-44">
          <SelectValue placeholder={t("Semua kategori", "All categories")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("Semua kategori", "All categories")}</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <form onSubmit={submitSearch} className="flex-1 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Cari deskripsi, vendor...", "Search description, vendor...")}
            className="h-9 pl-8"
          />
        </div>
        <Button type="submit" size="sm" variant="secondary" className="h-9">
          {t("Cari", "Search")}
        </Button>
        {(q || categoryId) && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 px-2"
            onClick={() => {
              setSearch("");
              push({ q: undefined, categoryId: undefined });
            }}
            title={t("Reset filter", "Clear filters")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
