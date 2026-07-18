import { Button } from "@/components/ui/button";
import { Mail, MessageCircle } from "lucide-react";

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
  const who = ownerName?.trim() || "tim";
  const about = projectName
    ? `project ${projectName}`
    : clientName
      ? `account ${clientName}`
      : "project saya";
  const waText = `Halo ${who}, saya ingin diskusi soal ${about}.`;
  const mailSubject = projectName
    ? `Diskusi project: ${projectName}`
    : clientName
      ? `Diskusi: ${clientName}`
      : "Diskusi project";
  const mailBody = `Halo ${who},\n\nSaya ingin diskusi soal ${about}.\n\nTerima kasih.`;

  const waUrl = getWhatsAppUrl(phone, waText);
  const mailUrl = getMailUrl(email, mailSubject, mailBody);

  if (!waUrl && !mailUrl) {
    return (
      <p className="text-sm text-muted-foreground">
        Kontak belum diset di workspace. Minta tim set email/telepon billing di Settings.
      </p>
    );
  }

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "flex flex-col gap-2 sm:flex-row"}>
      {waUrl && (
        <Button
          asChild
          variant={compact ? "outline" : "default"}
          size={compact ? "sm" : "default"}
          className={compact ? "h-8 gap-1 text-xs text-emerald-700 hover:text-emerald-800" : "gap-2 bg-emerald-600 hover:bg-emerald-700"}
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
          className={compact ? "h-8 gap-1 text-xs" : "gap-2"}
        >
          <a href={mailUrl}>
            <Mail className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            Email
          </a>
        </Button>
      )}
    </div>
  );
}
