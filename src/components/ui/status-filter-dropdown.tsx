"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusDropdownOption = {
  value: string;
  label: string;
  count?: number;
  href?: string;
};

export function StatusFilterDropdown({
  options,
  activeValue,
  label = "Status",
  className,
}: {
  options: StatusDropdownOption[];
  activeValue: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentOption = options.find((opt) => opt.value === activeValue) || options[0];

  function handleSelect(option: StatusDropdownOption) {
    if (option.href) {
      router.push(option.href);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (option.value === "all" || option.value === "active") {
      if (option.value === "all") params.delete("status");
      else params.set("status", option.value);
    } else {
      params.set("status", option.value);
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-2 border-border/80 bg-background font-medium shadow-2xs hover:bg-muted/50",
            className
          )}
        >
          <span className="text-xs text-muted-foreground">{label}:</span>
          <span className="text-xs font-semibold text-foreground">{currentOption?.label}</span>
          {typeof currentOption?.count === "number" && (
            <Badge
              variant="secondary"
              className="h-4.5 min-w-4.5 rounded-full px-1.5 py-0 text-[10px] font-bold"
            >
              {currentOption.count}
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {options.map((option) => {
          const isSelected = option.value === activeValue;
          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => handleSelect(option)}
              className="flex items-center justify-between py-1.5 text-xs font-medium cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>{option.label}</span>
                {typeof option.count === "number" && (
                  <Badge
                    variant={isSelected ? "default" : "secondary"}
                    className={cn(
                      "h-4 min-w-4 rounded-full px-1 text-[9px] font-bold",
                      isSelected && "bg-primary text-primary-foreground"
                    )}
                  >
                    {option.count}
                  </Badge>
                )}
              </div>
              {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
