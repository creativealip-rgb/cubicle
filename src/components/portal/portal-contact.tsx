"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";
import { ChevronRight, Clock3, Mail, MessageCircle, ShieldCheck } from "lucide-react";

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

  if (compact) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {lang === "en" ? `Contact ${who}` : `Hubungi ${who}`}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t(
              "Pilih kanal resmi untuk melanjutkan percakapan.",
              "Choose an official channel to continue the conversation.",
            )}
          </p>
        </div>
        <div className="space-y-2.5">
          {waUrl && (
            <Button
              asChild
              className="h-auto min-h-16 w-full justify-between rounded-xl bg-emerald-600 px-4 py-3 text-left hover:bg-emerald-700"
            >
              <a href={waUrl} target="_blank" rel="noreferrer">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">WhatsApp</span>
                    <span className="block text-xs font-normal text-white/80">
                      {t("Respons lebih cepat", "Faster response")}
                    </span>
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </a>
            </Button>
          )}
          {mailUrl && (
            <Button
              asChild
              variant="outline"
              className="h-auto min-h-16 w-full justify-between rounded-xl px-4 py-3 text-left"
            >
              <a href={mailUrl}>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Mail className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">Email</span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">{email}</span>
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            </Button>
          )}
        </div>
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t(
            "Pesan otomatis menyertakan konteks proyek kamu.",
            "Your message automatically includes your project context.",
          )}
        </p>
      </div>
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
