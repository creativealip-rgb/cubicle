"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

export function ActiveFilterSummary({
  basePath,
  filters,
  inline = false,
}: {
  basePath: string;
  filters: Array<{ key: string; label: string; value?: string | null }>;
  inline?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = filters.filter((filter) => filter.value);
  if (active.length === 0) return null;

  function clear() {
    const params = new URLSearchParams(searchParams.toString());
    active.forEach((filter) => params.delete(filter.key));
    router.push(`${basePath}${params.size ? `?${params}` : ""}`);
  }

  function removeSingle(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    router.push(`${basePath}${params.size ? `?${params}` : ""}`);
  }

  if (inline) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 text-xs animate-in fade-in duration-150">
        <span className="text-[11px] font-medium text-muted-foreground">
          Filter:
        </span>
        {active.map((filter) => (
          <span
            key={filter.key}
            className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-300"
          >
            <span>
              {filter.label}: {filter.value}
            </span>
            <button
              type="button"
              onClick={() => removeSingle(filter.key)}
              className="hover:text-violet-950 dark:hover:text-white transition-colors"
              title="Hapus filter ini"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {active.length > 1 && (
          <button
            type="button"
            onClick={clear}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1"
          >
            Hapus semua
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2 text-xs text-violet-950">
      <span className="font-semibold">Filter aktif:</span>
      {active.map((filter) => (
        <span
          key={filter.key}
          className="rounded-full bg-white px-2 py-1 ring-1 ring-violet-200"
        >
          {filter.label}: {filter.value}
        </span>
      ))}
      <button
        type="button"
        onClick={clear}
        className="ml-auto inline-flex items-center gap-1 font-medium text-violet-700 hover:text-violet-900"
      >
        <X className="h-3.5 w-3.5" />
        Hapus filter
      </button>
    </div>
  );
}
