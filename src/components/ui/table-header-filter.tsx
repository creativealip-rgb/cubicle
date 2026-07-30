"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type TableFilterOption = { value: string; label: string };

export function TableHeaderFilter({ label, queryKey, value, options, basePath, className }: {
  label: string;
  queryKey: string;
  value?: string;
  options: TableFilterOption[];
  basePath: string;
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = value || "all";
  function apply(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete(queryKey); else params.set(queryKey, next);
    router.push(`${basePath}${params.size ? `?${params}` : ""}`);
  }
  return <DropdownMenu>
    <DropdownMenuTrigger className={cn("flex items-center gap-1 rounded-sm font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", current !== "all" && "text-violet-700", className)}>
      {label}<ChevronDown className="h-3 w-3" />
      {current !== "all" && <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
      {options.map((option) => <DropdownMenuItem key={option.value} onSelect={() => apply(option.value)} className="flex justify-between gap-4">
        {option.label}{current === option.value && <Check className="h-4 w-4" />}
      </DropdownMenuItem>)}
    </DropdownMenuContent>
  </DropdownMenu>;
}
