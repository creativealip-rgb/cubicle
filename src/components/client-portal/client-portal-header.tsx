"use client";

import { useState } from "react";
import Image from "next/image";
import { useT } from "@/lib/i18n-client";
import { PortalLanguageSwitch } from "@/components/portal/portal-language-switch";

interface ClientPortalHeaderProps {
  clientName: string;
  clientCompanyName?: string | null;
  workspaceName?: string | null;
  workspaceLogoUrl?: string | null;
}

export function ClientPortalHeader({
  clientName,
  clientCompanyName,
  workspaceName,
  workspaceLogoUrl,
}: ClientPortalHeaderProps) {
  const { t } = useT();
  const [imgError, setImgError] = useState(false);

  const displayName = clientCompanyName || clientName || "Client";
  const brandName = workspaceName || "Cubiqlo";
  const initialLetter = displayName.trim().charAt(0).toUpperCase() || "C";

  return (
    <header className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs transition-all">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
        {/* Left: Client Logo / Monogram Fallback & Identity */}
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          {workspaceLogoUrl && !imgError ? (
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden bg-background border border-border/80 shadow-2xs shrink-0">
              <Image
                src={workspaceLogoUrl}
                alt={brandName}
                fill
                sizes="56px"
                className="object-contain p-1.5"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-xl font-bold text-primary shadow-2xs">
              {initialLetter}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground truncate">
              {displayName}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
              {t("Dikelola oleh", "Managed by")}{" "}
              <span className="font-semibold text-foreground">
                {brandName}
              </span>
            </p>
          </div>
        </div>

        {/* Right: Language Switch */}
        <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
          <PortalLanguageSwitch />
        </div>
      </div>
    </header>
  );
}
