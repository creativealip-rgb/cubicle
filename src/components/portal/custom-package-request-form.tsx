"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { createCustomPackageRequest } from "@/lib/actions/custom-package-requests";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Package } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { portalLocale } from "@/lib/portal-i18n";

interface PackageOption {
  id: string;
  name: string;
  hours: number | null;
  price: string;
  customPrice: string | null;
  minHours: number | null;
  maxHours: number | null;
  currency: string;
}

interface CustomPackageRequestProps {
  projectId: string;
  token: string;
  packages: PackageOption[];
  existingRequests: Array<{
    id: string;
    requestedHours: number;
    estimatedPrice: string | null;
    message: string | null;
    status: string;
    createdAt: Date;
  }>;
  currency: string;
}

export function CustomPackageRequestForm({
  projectId,
  token,
  packages,
  existingRequests,
  currency,
}: CustomPackageRequestProps) {
  const { lang, t } = useT();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(40);
  const [message, setMessage] = useState("");

  const minH = useMemo(
    () => Math.min(...packages.map((p) => p.minHours ?? p.hours ?? 1)),
    [packages],
  );
  const maxH = useMemo(
    () => Math.max(...packages.map((p) => p.maxHours ?? (p.hours ?? 0) * 3)),
    [packages],
  );

  const estimatedPrice = useMemo(() => {
    // Find best matching package based on hours
    const matching = packages.find(
      (p) =>
        p.hours != null &&
        (p.minHours == null || hours >= p.minHours) &&
        (p.maxHours == null || hours <= p.maxHours),
    );
    const base = matching ?? packages[0];
    if (!base || !base.hours) return null;
    const basePrice = Number(base.customPrice ?? base.price);
    return Math.round((basePrice / base.hours) * hours);
  }, [hours, packages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createCustomPackageRequest({
        credential: token,
        projectId,
        hours,
        message: message || null,
        idempotencyKey: crypto.randomUUID(),
      });
      toast.success(t("Permintaan terkirim!", "Request sent!"));
      setMessage("");
      setExpanded(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("Gagal mengirim permintaan", "Failed to submit request"),
      );
    } finally {
      setLoading(false);
    }
  }

  const statusBadge = (status: string) => {
    if (status === "approved")
      return (
        <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
          {t("Disetujui", "Approved")}
        </Badge>
      );
    if (status === "rejected")
      return (
        <Badge className="bg-red-100 text-red-700 text-[10px]">
          {t("Ditolak", "Rejected")}
        </Badge>
      );
    return (
      <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">
        {t("Menunggu", "Pending")}
      </Badge>
    );
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat(portalLocale(lang), {
      style: "currency",
      currency: currency || "IDR",
    }).format(price);

  return (
    <div className="space-y-4">
      {/* Existing Requests */}
      {existingRequests.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">
            {t("Permintaan Kamu", "Your Requests")}
          </h4>
          <div className="space-y-2">
            {existingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div>
                  <span className="font-medium">
                    {req.requestedHours} {t("jam", "hours")}
                  </span>
                  {req.estimatedPrice && (
                    <span className="text-muted-foreground ml-2">
                      — {formatPrice(Number(req.estimatedPrice))}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(req.status)}
                  <span className="text-xs text-muted-foreground">
                    {new Date(req.createdAt).toLocaleDateString(
                      portalLocale(lang),
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Form Toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between rounded-lg border border-dashed p-4 text-sm hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          <span className="font-medium">
            {t("Minta Paket Khusus", "Request Custom Package")}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {expanded && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {t("Permintaan Paket Khusus", "Custom Package Request")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="hours" className="text-xs">
                  {t("Jam per bulan", "Hours per month")}:{" "}
                  <span className="font-bold">{hours}</span>
                </Label>
                <Input
                  id="hours"
                  type="range"
                  min={minH}
                  max={maxH}
                  step={1}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{minH}h</span>
                  <span>{maxH}h</span>
                </div>
              </div>

              {estimatedPrice != null && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    {t("Estimasi harga", "Estimated price")}
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {formatPrice(estimatedPrice)}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="req-message" className="text-xs">
                  {t("Pesan (opsional)", "Message (optional)")}
                </Label>
                <Textarea
                  id="req-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t(
                    "Tuliskan kebutuhan khusus...",
                    "Any specific requirements...",
                  )}
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                size="sm"
                className="w-full"
              >
                {loading
                  ? t("Mengirim...", "Submitting...")
                  : t("Minta Penawaran", "Request Quote")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
