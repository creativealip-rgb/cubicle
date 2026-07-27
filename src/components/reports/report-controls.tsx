"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = { lang: string; preset: string; from: string; to: string };

export function ReportControls({ lang, preset, from, to }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customOpen, setCustomOpen] = useState(preset === "custom");
  const t = (id: string, en: string) => (lang === "en" ? en : id);

  function navigate(period: string, customFrom?: string, customTo?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    params.delete("from");
    params.delete("to");
    if (period === "custom" && customFrom && customTo) {
      params.set("from", customFrom);
      params.set("to", customTo);
    }
    router.push(`/app/reports?${params.toString()}`);
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex">
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
            className="h-10 w-full sm:w-[190px]"
            aria-label={t("Pilih periode laporan", "Select report period")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
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
        <Button
          variant="outline"
          className="h-10"
          onClick={() => {
            const params = new URLSearchParams({ period: preset });
            if (preset === "custom") {
              params.set("from", from);
              params.set("to", to);
            }
            window.location.href = `/api/reports/export/xlsx?${params.toString()}`;
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          {t("Ekspor Excel", "Export Excel")}
        </Button>
      </div>
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
          <input
            name="from"
            type="date"
            defaultValue={from}
            required
            aria-label={t("Tanggal mulai", "Start date")}
            className="h-10 min-w-0 rounded-md border bg-background px-2 text-sm"
          />
          <input
            name="to"
            type="date"
            defaultValue={to}
            required
            aria-label={t("Tanggal akhir", "End date")}
            className="h-10 min-w-0 rounded-md border bg-background px-2 text-sm"
          />
          <Button type="submit" size="sm" className="h-10">
            {t("Terapkan", "Apply")}
          </Button>
        </form>
      )}
    </div>
  );
}
