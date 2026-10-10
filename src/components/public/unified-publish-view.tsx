"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n-client";
import { toast } from "sonner";
import {
  Copy,
  ExternalLink,
  MessageCircle,
  QrCode,
  Download,
  Code2,
  X,
  Send,
  Globe,
  Share2,
} from "lucide-react";

export interface UnifiedPublishViewProps {
  type: "proposal" | "contract" | "form" | "site";
  title?: string;
  shareUrl: string;
  previewUrl?: string;
  pdfUrl?: string;
  embedCode?: string;
  hasSaved?: boolean;
  publishedStatusNode?: React.ReactNode;
}

export function UnifiedPublishView({
  type,
  title = "Document",
  shareUrl,
  previewUrl,
  pdfUrl,
  embedCode,
  hasSaved = true,
  publishedStatusNode,
}: UnifiedPublishViewProps) {
  const { t } = useT();
  const [showQrModal, setShowQrModal] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);

  const getDocTypeLabels = () => {
    switch (type) {
      case "proposal":
        return {
          title: t("Publikasikan & Kirim Proposal", "Publish & Send Proposal"),
          subtitle: t(
            "Bagikan tautan resmi kepada klien untuk ditinjau dan disetujui secara digital.",
            "Share universal link with your client for review and digital signature."
          ),
          fieldLabel: t("Link Publik Proposal", "Public Proposal Link"),
          waMessage: `Halo, berikut tautan resmi untuk meninjau "${title}":\n${shareUrl}`,
          qrTitle: t("QR Code Proposal", "Proposal QR Code"),
          qrDesc: t(
            "Pindai untuk membuka proposal ini langsung di perangkat klien.",
            "Scan to open this proposal directly on client's smartphone."
          ),
        };
      case "contract":
        return {
          title: t("Publikasikan & Kirim Kontrak", "Publish & Send Contract"),
          subtitle: t(
            "Bagikan tautan resmi kepada klien untuk penandatanganan digital secara instan.",
            "Share universal link with your client for instant digital signature."
          ),
          fieldLabel: t("Link Publik Kontrak", "Public Contract Link"),
          waMessage: `Halo, berikut tautan resmi untuk penandatanganan kontrak "${title}":\n${shareUrl}`,
          qrTitle: t("QR Code Kontrak", "Contract QR Code"),
          qrDesc: t(
            "Pindai untuk menandatangani kontrak langsung di perangkat klien.",
            "Scan to sign this contract directly on client's smartphone."
          ),
        };
      case "form":
        return {
          title: t("Bagikan & Publikasikan Formulir", "Publish & Share Form"),
          subtitle: t(
            "Bagikan link formulir kepada klien atau sematkan di situs web Anda.",
            "Share universal form link with your clients or embed it on your website."
          ),
          fieldLabel: t("Link Publik Formulir", "Public Form Link"),
          waMessage: `Halo, silakan isi formulir "${title}" melalui tautan berikut:\n${shareUrl}`,
          qrTitle: t("QR Code Formulir", "Form QR Code"),
          qrDesc: t(
            "Pindai untuk mengisi formulir langsung dari smartphone.",
            "Scan to fill out this form directly from smartphone."
          ),
        };
      case "site":
      default:
        return {
          title: t("Status & Publikasi Landing Page", "Landing Page Publication"),
          subtitle: t(
            "Kelola visibilitas landing page dan bagikan link website resmi Anda.",
            "Manage landing page visibility and share your official website link."
          ),
          fieldLabel: t("Link Publik Website", "Public Website Link"),
          waMessage: `Halo, silakan kunjungi website resmi kami melalui tautan berikut:\n${shareUrl}`,
          qrTitle: t("QR Code Website", "Website QR Code"),
          qrDesc: t(
            "Pindai untuk membuka website resmi kami di browser seluler.",
            "Scan to open our official website in mobile browser."
          ),
        };
    }
  };

  const labels = getDocTypeLabels();

  if (!hasSaved) {
    return (
      <div className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-8 flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-border/80 bg-background p-8 text-center space-y-3 shadow-xs">
          <Share2 className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <h4 className="text-sm font-bold text-foreground">{t("Belum Disimpan", "Document Not Saved")}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t(
              "Klik tombol Simpan di header atas terlebih dahulu untuk menghasilkan link publik dan opsi berbagi.",
              "Click the Save button in the top header first to generate public links and sharing options."
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-8 custom-scrollbar">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-border/80 bg-background p-6 sm:p-8 shadow-xs space-y-6">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-foreground">{labels.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{labels.subtitle}</p>
            </div>
            {publishedStatusNode && <div className="shrink-0">{publishedStatusNode}</div>}
          </div>

          {/* Universal Link Card */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
            <label className="text-xs font-bold text-foreground">{labels.fieldLabel}</label>
            <div className="flex items-center gap-2">
              <Input
                value={shareUrl || "https://cubiqlo.com/..."}
                readOnly
                className="font-mono text-xs bg-background h-9.5"
              />
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  if (shareUrl) {
                    await navigator.clipboard.writeText(shareUrl);
                    toast.success(t("Link berhasil disalin ke clipboard!", "Link copied to clipboard!"));
                  }
                }}
                className="shrink-0 gap-1.5 text-xs font-semibold h-9.5 px-3.5"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{t("Salin", "Copy")}</span>
              </Button>
              {shareUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(previewUrl || shareUrl, "_blank")}
                  className="shrink-0 gap-1.5 text-xs font-semibold h-9.5 px-3.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>{t("Buka", "Open")}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Action Grid (WhatsApp, QR Code, PDF/Embed/Open) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* WhatsApp Share */}
            <Button
              type="button"
              variant="outline"
              className="h-auto py-3.5 px-3 flex-col gap-1.5 rounded-xl border-border/80 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-center group"
              onClick={() => {
                const text = encodeURIComponent(labels.waMessage);
                window.open(`https://wa.me/?text=${text}`, "_blank");
              }}
            >
              <MessageCircle className="h-4 w-4 text-emerald-600 transition-transform group-hover:scale-110" />
              <span className="text-xs font-bold text-foreground">WhatsApp Share</span>
              <span className="text-[10px] text-muted-foreground">{t("Kirim via WhatsApp", "Send via WA Chat")}</span>
            </Button>

            {/* QR Code Modal Trigger */}
            <Button
              type="button"
              variant="outline"
              className="h-auto py-3.5 px-3 flex-col gap-1.5 rounded-xl border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all text-center group"
              onClick={() => setShowQrModal(true)}
            >
              <QrCode className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
              <span className="text-xs font-bold text-foreground">QR Code</span>
              <span className="text-[10px] text-muted-foreground">{t("Scan di Perangkat Mobile", "Scan on Mobile Device")}</span>
            </Button>

            {/* Action 3: Embed Widget (Forms, Proposals, Contracts, Site) */}
            <Button
              type="button"
              variant="outline"
              className="h-auto py-3.5 px-3 flex-col gap-1.5 rounded-xl border-border/80 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-center group"
              onClick={() => setShowEmbedModal(true)}
            >
              <Code2 className="h-4 w-4 text-blue-600 transition-transform group-hover:scale-110" />
              <span className="text-xs font-bold text-foreground">Embed Widget</span>
              <span className="text-[10px] text-muted-foreground">{t("Sematkan di Website", "Embed HTML iFrame")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── MODAL: QR CODE ── */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-0 duration-200"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="max-w-xs w-full rounded-2xl border border-border/80 bg-background p-6 shadow-xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">{labels.qrTitle}</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowQrModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 inline-block mx-auto shadow-2xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`}
                alt="QR Code"
                className="h-44 w-44 mx-auto"
              />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{labels.qrDesc}</p>
          </div>
        </div>
      )}

      {/* ── MODAL: EMBED IFRAME (FOR FORMS) ── */}
      {showEmbedModal && embedCode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-0 duration-200"
          onClick={() => setShowEmbedModal(false)}
        >
          <div
            className="max-w-lg w-full rounded-2xl border border-border/80 bg-background p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="h-4.5 w-4.5 text-primary" />
                <h3 className="font-bold text-sm text-foreground">{t("Embed Form di Website", "Embed Form on Website")}</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowEmbedModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(
                "Salin kode iFrame di bawah dan tempelkan ke dalam HTML website Anda (WordPress, Webflow, Shopify, custom site).",
                "Copy the iFrame code below and paste it into your website HTML (WordPress, Webflow, Shopify, custom site)."
              )}
            </p>
            <Textarea
              readOnly
              value={embedCode}
              rows={4}
              className="text-xs font-mono bg-muted/40 resize-none"
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEmbedModal(false)}
                className="text-xs"
              >
                {t("Tutup", "Close")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(embedCode);
                  toast.success(t("Kode embed berhasil disalin ke clipboard!", "Embed code copied to clipboard!"));
                  setShowEmbedModal(false);
                }}
                className="text-xs font-semibold gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{t("Salin Kode Embed", "Copy Embed Code")}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
