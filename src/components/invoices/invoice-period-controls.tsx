"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  lang: string;
  preset?: string;
  from?: string;
  to?: string;
};

export function InvoicePeriodControls({ lang, preset = "all", from = "", to = "" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customOpen, setCustomOpen] = useState(preset === "custom");
  const t = (id: string, en: string) => (lang === "en" ? en : id);

  function navigate(period: string, customFrom?: string, customTo?: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (period === "all") {
      params.delete("period");
      params.delete("from");
      params.delete("to");
    } else {
      params.set("period", period);
      params.delete("from");
      params.delete("to");
      if (period === "custom" && customFrom && customTo) {
        params.set("from", customFrom);
        params.set("to", customTo);
      }
    }
    params.delete("page");
    router.push(`/app/invoices?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <Select
        value={preset}
        onValueChange={(value) => {
          if (value === "custom") setCustomOpen(true);
          else {
            setCustomOpen(false);
            navigate(value);
          }
        }}
      >
        <SelectTrigger
          className="h-8 w-full text-xs sm:w-[180px]"
          aria-label={t("Pilih periode invoice", "Select invoice period")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {t("Semua periode", "All time")}
          </SelectItem>
          <SelectItem value="month">
            {t("Bulan berjalan", "Current month")}
          </SelectItem>
          <SelectItem value="previous-month">
            {t("Bulan lalu", "Previous month")}
          </SelectItem>
          <SelectItem value="quarter">
            {t("Kuartal berjalan", "Current quarter")}
          </SelectItem>
          <SelectItem value="year">
            {t("Tahun berjalan", "Current year")}
          </SelectItem>
          <SelectItem value="custom">
            {t("Rentang khusus", "Custom range")}
          </SelectItem>
        </SelectContent>
      </Select>

      {customOpen && (
        <form
          className="grid grid-cols-[1fr_1fr_auto] gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            navigate(
              "custom",
              String(form.get("from")),
              String(form.get("to")),
            );
          }}
        >
          <Input
            type="date"
            name="from"
            defaultValue={from}
            className="h-8 text-xs"
            required
          />
          <Input
            type="date"
            name="to"
            defaultValue={to}
            className="h-8 text-xs"
            required
          />
          <Button size="sm" type="submit" className="h-8 text-xs">
            {t("Terapkan", "Apply")}
          </Button>
        </form>
      )}
    </div>
  );
}
