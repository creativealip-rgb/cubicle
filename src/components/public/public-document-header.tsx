"use client";

import { useState } from "react";
import Image from "next/image";
import { PortalLanguageSwitch } from "@/components/portal/portal-language-switch";
import { useT } from "@/lib/i18n-client";

// Header props definition
interface PublicDocumentHeaderProps {
  badgeLabel?: string;
  badgeType?: "proposal" | "contract" | "form" | "portal";
  documentType?: "proposal" | "contract" | "form" | "portal";
  documentTitle?: string;
  workspaceName?: string | null;
  workspaceLogoUrl?: string | null;
}

export function PublicDocumentHeader({
  badgeLabel,
  documentType = "form",
  documentTitle,
  workspaceName,
  workspaceLogoUrl,
}: PublicDocumentHeaderProps) {
  const { t } = useT();
  const [imgError, setImgError] = useState(false);

  const brandDisplayName = workspaceName || "Cubiqlo Workspace";


  const subtext =
    documentType === "proposal"
      ? t("Proposal dibuat via Cubiqlo", "Proposal created via Cubiqlo")
      : documentType === "contract"
      ? t("Kontrak dibuat via Cubiqlo", "Contract created via Cubiqlo")
      : t("Formulir dibuat via Cubiqlo", "Form created via Cubiqlo");

  return (
    <header className="mb-6 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all">
      <div className="flex items-center justify-between gap-4">
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
            <div className="relative h-11 w-11 sm:h-12 sm:w-12 shrink-0 overflow-hidden rounded-xl shadow-2xs">
              <Image src="/logo-icon.png" alt="Cubiqlo" fill sizes="48px" className="object-contain" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
              {brandDisplayName}
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {subtext}
            </p>
          </div>
        </div>

        {/* Right: Language switch */}
        <div className="flex items-center gap-2.5 self-center shrink-0">
          <PortalLanguageSwitch />
        </div>
      </div>
    </header>
  );
}