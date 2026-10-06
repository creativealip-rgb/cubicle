"use client";

import { MessageCircle, Mail, Clock, ShieldCheck, MapPin, Building2, Send, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n-client";

interface PortalContactProps {
  phone?: string | null;
  email?: string | null;
  ownerName?: string | null;
  clientName?: string | null;
  billingAddress?: string | null;
  billingPhone?: string | null;
  projectName?: string | null;
  workingHours?: string | null;
  supportNote?: string | null;
  bookingSlug?: string | null;
  compact?: boolean;
  inline?: boolean;
}

function getWhatsAppUrl(phone: string | null | undefined, message: string) {
  if (!phone) return null;
  const normalized = phone.replace(/\D/g, "").replace(/^0/, "62");
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function getMailUrl(email: string | null | undefined, subject: string, body: string) {
  if (!email || !email.includes("@")) return null;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function PortalContactButtons({
  phone,
  email,
  ownerName,
  clientName,
  billingAddress,
  projectName,
  workingHours,
  supportNote,
  bookingSlug,
  compact = false,
  inline = false,
}: PortalContactProps) {
  const { lang, t } = useT();
  const who = ownerName?.trim() || "Cubiqlo Team";
  const about = projectName
    ? `${t("proyek", "project")} ${projectName}`
    : clientName
    ? `${clientName}`
    : t("proyek saya", "my project");

  const waText =
    lang === "en"
      ? `Hello ${who}, I would like to discuss ${about}.`
      : `Halo ${who}, saya ingin diskusi mengenai ${about}.`;
  const mailSubject = projectName
    ? `${t("Diskusi Proyek", "Project Discussion")}: ${projectName}`
    : clientName
    ? `${t("Diskusi Klien", "Client Discussion")}: ${clientName}`
    : t("Diskusi Proyek", "Project Discussion");
  const mailBody =
    lang === "en"
      ? `Hello ${who},\n\nI would like to discuss ${about}.\n\nThank you.`
      : `Halo ${who},\n\nSaya ingin berdiskusi mengenai ${about}.\n\nTerima kasih.`;

  const waUrl = getWhatsAppUrl(phone, waText);
  const mailUrl = getMailUrl(email, mailSubject, mailBody);

  if (inline) {
    return (
      <div className="flex items-center gap-2">
        {waUrl && (
          <Button
            asChild
            size="sm"
            className="h-7 gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
          >
            <a href={waUrl} target="_blank" rel="noreferrer">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          </Button>
        )}
        {mailUrl && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 rounded-lg px-2.5 text-xs font-semibold shadow-xs"
          >
            <a href={mailUrl}>
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              Email
            </a>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* 1. Left Card: Official Channels (WhatsApp & Email) */}
      <Card className="md:col-span-2 rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
              <MessageCircle className="h-3 w-3" />
              {t("Kanal Resmi", "Official Channels")}
            </span>
            <h3 className="mt-2 text-base sm:text-lg font-bold text-foreground">
              {lang === "en" ? `Get in touch with ${who}` : `Hubungi ${who}`}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {t(
                "Pilih kanal komunikasi langsung di bawah ini untuk konsultasi, revisi, atau pertanyaan terkait proyek kamu.",
                "Choose a direct communication channel below for consultations, revisions, or inquiries regarding your projects.",
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* WhatsApp Card Button */}
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 transition-all hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {t("Respon Cepat", "Fast Response")}
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-sm font-bold text-foreground group-hover:text-emerald-600 transition-colors">
                    WhatsApp
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {phone || t("Chat Langsung", "Direct Chat")}
                  </p>
                </div>
              </a>
            ) : (
              <div className="flex flex-col justify-between rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4 opacity-70">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div className="mt-3">
                  <p className="text-sm font-bold text-foreground">WhatsApp</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("Tidak dikonfigurasi", "Not configured")}
                  </p>
                </div>
              </div>
            )}

            {/* Email Card Button */}
            {mailUrl ? (
              <a
                href={mailUrl}
                className="group flex flex-col justify-between rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 transition-all hover:bg-blue-500/10 hover:border-blue-500/50 hover:shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                    <Mail className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    {t("Surat Resmi", "Official Mail")}
                  </span>
                </div>
                <div className="mt-3 min-w-0">
                  <p className="text-sm font-bold text-foreground group-hover:text-blue-600 transition-colors">
                    Email
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate" title={email || ""}>
                    {email || "admin@cubiqlo.com"}
                  </p>
                </div>
              </a>
            ) : (
              <div className="flex flex-col justify-between rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4 opacity-70">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="mt-3">
                  <p className="text-sm font-bold text-foreground">Email</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("Tidak tersedia", "Not available")}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground border border-border/60">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p>
              {t(
                "Pesan yang dikirim otomatis menyertakan identitas dan konteks proyek kamu agar tim bisa langsung merespons dengan tepat.",
                "Messages sent automatically include your project context so the team can assist accurately.",
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Right Card: Working Hours & Response Policy */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("Informasi Layanan", "Service Info")}
          </h4>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:text-purple-400">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t("Jam Operasional", "Working Hours")}</p>
                <p className="text-muted-foreground mt-0.5">
                  {workingHours || t("Senin – Jumat (09.00 – 17.00 WIB)", "Monday – Friday (09:00 – 17:00)")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t("Diskusi & Meeting", "Meetings & Sync")}</p>
                <p className="text-muted-foreground mt-0.5">
                  {supportNote || t("Gunakan tombol 'Schedule Meeting' di atas untuk booking jadwal sync.", "Use 'Schedule Meeting' button above to book a sync session.")}
                </p>
              </div>
            </div>
            {billingAddress && (
              <div className="flex items-start gap-3 pt-2 border-t border-border/60">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{t("Alamat Kantor", "Office Location")}</p>
                  <p className="text-muted-foreground mt-0.5 leading-relaxed">
                    {billingAddress}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
