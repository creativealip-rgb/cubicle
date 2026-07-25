"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";
import { Clock3, Mail, MessageCircle, ShieldCheck } from "lucide-react";

function getWhatsAppUrl(phone: string | null | undefined, message: string) {
  if (!phone) return null;
  const normalized = phone.replace(/\D/g, "").replace(/^0/, "62");
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function getMailUrl(
  email: string | null | undefined,
  subject: string,
  body: string,
) {
  if (!email || !email.includes("@")) return null;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function PortalContactButtons({
  phone,
  email,
  ownerName,
  clientName,
  projectName,
  compact = false,
}: {
  phone?: string | null;
  email?: string | null;
  ownerName?: string | null;
  clientName?: string | null;
  projectName?: string | null;
  compact?: boolean;
}) {
  const { lang, t } = useT();
  const who = ownerName?.trim() || t("tim", "team");
  const about = projectName
    ? `${t("proyek", "project")} ${projectName}`
    : clientName
      ? `${clientName}`
      : t("proyek saya", "my project");
  const waText =
    lang === "en"
      ? `Hello ${who}, I would like to discuss ${about}.`
      : `Halo ${who}, saya ingin diskusi soal ${about}.`;
  const mailSubject = projectName
    ? `${t("Diskusi proyek", "Project discussion")}: ${projectName}`
    : clientName
      ? `${t("Diskusi", "Discussion")}: ${clientName}`
      : t("Diskusi proyek", "Project discussion");
  const mailBody =
    lang === "en"
      ? `Hello ${who},\n\nI would like to discuss ${about}.\n\nThank you.`
      : `Halo ${who},\n\nSaya ingin diskusi soal ${about}.\n\nTerima kasih.`;

  const waUrl = getWhatsAppUrl(phone, waText);
  const mailUrl = getMailUrl(email, mailSubject, mailBody);

  if (!waUrl && !mailUrl) {
    return (
      <p className="text-sm text-muted-foreground">
        {t(
          "Kontak resmi belum tersedia. Hubungi pengelola workspace untuk memperbarui email atau nomor telepon.",
          "Official contact details are not available yet. Ask the workspace manager to update the email or phone number.",
        )}
      </p>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      {!compact ? (
        <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 text-sm sm:grid-cols-2">
          <div className="flex gap-3">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {t("Hubungi tim terkait proyek", "Contact the project team")}
              </p>
              <p className="text-muted-foreground">
                {t(
                  "Sertakan nama proyek dan detail kebutuhan agar tindak lanjut lebih cepat.",
                  "Include the project name and request details for a faster response.",
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {t("Gunakan kanal resmi", "Use official channels")}
              </p>
              <p className="text-muted-foreground">
                {t(
                  "Percakapan dibuka langsung melalui kontak resmi",
                  "The conversation opens directly with the official contact",
                )}{" "}
                {ownerName?.trim() || t("tim", "team")}.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <div
        className={
          compact ? "flex flex-wrap gap-2" : "flex flex-col gap-2 sm:flex-row"
        }
      >
        {waUrl && (
          <Button
            asChild
            variant={compact ? "outline" : "default"}
            size={compact ? "sm" : "default"}
            className={
              compact
                ? "min-h-11 gap-1 text-xs text-emerald-700 hover:text-emerald-800"
                : "min-h-11 gap-2 bg-emerald-600 hover:bg-emerald-700"
            }
          >
            <a href={waUrl} target="_blank" rel="noreferrer">
              <MessageCircle className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
              WhatsApp
            </a>
          </Button>
        )}
        {mailUrl && (
          <Button
            asChild
            variant="outline"
            size={compact ? "sm" : "default"}
            className={compact ? "min-h-11 gap-1 text-xs" : "min-h-11 gap-2"}
          >
            <a href={mailUrl}>
              <Mail className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
              Email
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
