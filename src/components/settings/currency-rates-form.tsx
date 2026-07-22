"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  deleteWorkspaceCurrencyRate,
  upsertWorkspaceCurrencyRate,
} from "@/lib/actions/currency-rates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n-client";

const COMMON = ["USD", "EUR", "SGD", "AUD", "GBP", "MYR", "JPY", "IDR"];

export type CurrencyRateRow = {
  id: string;
  fromCurrency: string;
  rate: number;
};

type Props = {
  baseCurrency: string;
  rates: CurrencyRateRow[];
  canEdit: boolean;
};

export function CurrencyRatesForm({ baseCurrency, rates, canEdit }: Props) {
  const { t } = useT();
  const router = useRouter();
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const options = useMemo(
    () => COMMON.filter((c) => c !== baseCurrency),
    [baseCurrency],
  );

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    const n = Number(rate);
    if (!fromCurrency || !Number.isFinite(n) || n <= 0) {
      toast.error(t("Rate harus angka > 0", "Rate must be a number > 0"));
      return;
    }
    setBusy(true);
    try {
      await upsertWorkspaceCurrencyRate({ fromCurrency, rate: n });
      toast.success(
        t(
          `1 ${fromCurrency} = ${n} ${baseCurrency}`,
          `1 ${fromCurrency} = ${n} ${baseCurrency}`,
        ),
      );
      setRate("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal simpan", "Save failed"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(code: string) {
    if (!canEdit) return;
    setDeleting(code);
    try {
      await deleteWorkspaceCurrencyRate({ fromCurrency: code });
      toast.success(t(`Rate ${code} dihapus`, `${code} rate removed`));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal hapus", "Delete failed"));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
        <p>
          {t(
            `Base currency workspace: ${baseCurrency}. Dashboard finance dihitung setara base ini.`,
            `Workspace base currency: ${baseCurrency}. Dashboard finance is shown in this base.`,
          )}
        </p>
        <p>
          {t(
            "Isi rate manual: 1 mata uang asing = berapa base. Tanpa rate, angka currency itu di-skip (tidak ditebak).",
            "Set manual rates: 1 foreign unit = how many base. Missing rates are skipped (never guessed).",
          )}
        </p>
        <p>
          {t(
            "Ubah base currency di tab Branding & Invoice.",
            "Change base currency in Branding & Invoice tab.",
          )}
        </p>
      </div>

      {rates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("Belum ada rate. Tambah mis. USD → IDR.", "No rates yet. Add e.g. USD → IDR.")}
        </p>
      ) : (
        <div className="space-y-2">
          {rates.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  1 {r.fromCurrency} = {r.rate} {baseCurrency}
                </p>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={deleting === r.fromCurrency}
                  onClick={() => onDelete(r.fromCurrency)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <form onSubmit={onSave} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="fromCurrency">{t("Dari", "From")}</Label>
            <select
              id="fromCurrency"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
            >
              {options.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fxRate">
              {t(`1 ${fromCurrency} = … ${baseCurrency}`, `1 ${fromCurrency} = … ${baseCurrency}`)}
            </Label>
            <Input
              id="fxRate"
              type="number"
              min="0"
              step="any"
              placeholder={baseCurrency === "IDR" ? "16200" : "1.0"}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={busy} className="sm:mb-0">
            <Plus className="h-4 w-4 mr-1" />
            {busy ? t("Simpan…", "Saving…") : t("Simpan rate", "Save rate")}
          </Button>
        </form>
      )}
    </div>
  );
}
