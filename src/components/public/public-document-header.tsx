"use client";

import { useState } from "react";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { PortalLanguageSwitch } from "@/components/portal/portal-language-switch";
import { useT } from "@/lib/i18n-client";

// Header props definition
interface PublicDocumentHeaderProps {
  badgeLabel: string;
  badgeType?: "proposal" | "contract" | "form" | "portal";
  documentTitle?: string;
  workspaceName?: string | null;
  workspaceLogoUrl?: string | null;
}

export function PublicDocumentHeader({
  badgeLabel,
  documentTitle,
  workspaceName,
  workspaceLogoUrl,
}: PublicDocumentHeaderProps) {
  const { t } = useT();
  const [imgError, setImgError] = useState(false);

  const brandDisplayName = workspaceName || "Cubiqlo Workspace";
  const initialLetter = (workspaceName || "C").trim().charAt(0).toUpperCase();

  return (
    <header className="mb-6 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Brand logo & official metadata */}
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          {workspaceLogoUrl && !imgError ? (
            <div className="relative h-11 w-11 sm:h-12 sm:w-12 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-background shadow-2xs">
              <Image
                src={workspaceLogoUrl}
                alt={brandDisplayName}
                fill
                sizes="48px"
                className="object-contain p-1"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-lg font-bold text-primary shadow-2xs">
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
            <h2 className="mt-0.5 text-sm sm:text-base font-bold tracking-tight text-foreground truncate">
              {brandDisplayName}
            </h2>
            <p className="text-[11px] text-muted-foreground truncate">
              {t("Dikelola secara resmi via Cubiqlo", "Officially managed via Cubiqlo")}
            </p>
          </div>
        </div>

        {/* Right: Language switch & status indicator */}
        <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t("Aktif", "Active")}</span>
          </div>
          <PortalLanguageSwitch />
        </div>
      </div>
    </header>
  );
}