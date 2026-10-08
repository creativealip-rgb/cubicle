"use client";

import Image from "next/image";
import { ShieldCheck, LockKeyhole } from "lucide-react";
import { PortalLanguageSwitch } from "@/components/portal/portal-language-switch";
import { useT } from "@/lib/i18n-client";

interface PublicDocumentHeaderProps {
  badgeLabel: string;
  badgeType?: "proposal" | "contract" | "form" | "portal";
  documentTitle: string;
  workspaceName?: string | null;
  workspaceLogoUrl?: string | null;
  securityLabel?: string;
}

export function PublicDocumentHeader({
  badgeLabel,
  documentTitle,
  workspaceName,
  workspaceLogoUrl,
  securityLabel,
}: PublicDocumentHeaderProps) {
  const { t } = useT();

  const initialLetter = (workspaceName || documentTitle || "C").trim().charAt(0).toUpperCase();

  return (
    <header className="mb-6 rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-sm backdrop-blur-xs transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Brand logo & details */}
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          {workspaceLogoUrl ? (
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xs">
              <Image
                src={workspaceLogoUrl}
                alt={workspaceName || "Brand Logo"}
                fill
                sizes="56px"
                className="object-contain p-1"
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-xl font-bold text-primary shadow-2xs">
              {initialLetter}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                <ShieldCheck className="h-3 w-3" />
                {badgeLabel}
              </span>
            </div>
            <h1 className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
              {documentTitle}
            </h1>
            {workspaceName && (
              <p className="mt-0.5 text-xs text-muted-foreground truncate">
                {t("Dikelola oleh", "Managed by")}{" "}
                <span className="font-semibold text-foreground">{workspaceName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right: Language switch & Security Badge */}
        <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
          <PortalLanguageSwitch />
          <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-2xs backdrop-blur-xs">
            <LockKeyhole className="h-3 w-3 text-emerald-600" />
            <span>{securityLabel || t("Akses Terenkripsi", "Encrypted Access")}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
