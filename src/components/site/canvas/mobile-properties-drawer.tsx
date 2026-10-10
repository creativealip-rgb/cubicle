"use client";

import { useEffect, useRef, useState } from "react";
import type { PersonalSiteSection } from "@/lib/personal-site/model";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { PropertiesContent } from "./properties-panel";
import { useT } from "@/lib/i18n-client";

type MobilePropertiesDrawerProps = {
  section: PersonalSiteSection | null;
  onUpdate: (patch: Partial<PersonalSiteSection>) => void;
  onDelete?: () => void;
  onClose: () => void;
};

/**
 * True only on mobile viewports, matching the `md:hidden` wrapper the mobile
 * step editor is rendered in. Keeps the drawer out of the desktop DOM, where
 * the right rail already exposes the same controls.
 */
function useMobileViewport() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return isMobile;
}

/**
 * Mobile bottom drawer that renders the same `PropertiesContent` as the desktop
 * rail, so all 20 section types are editable on mobile. Open state is driven by
 * `section` (null = closed). On close, focus returns to the section row.
 */
export function MobilePropertiesDrawer({ section, onUpdate, onDelete, onClose }: MobilePropertiesDrawerProps) {
  const { t } = useT();
  const isMobileViewport = useMobileViewport();
  // Last selected section id — kept after close so focus can return to its row.
  const lastSectionIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (section) lastSectionIdRef.current = section.id;
  }, [section]);

  return (
    <Sheet open={isMobileViewport && section !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="flex max-h-[85vh] flex-col gap-0 rounded-t-2xl p-0 md:hidden [&>button]:hidden"
        onCloseAutoFocus={(event) => {
          // Focus returns to the section row that opened the drawer.
          const id = lastSectionIdRef.current;
          const row = id ? document.getElementById(`section-row-${id}`) : null;
          if (!row) return;
          event.preventDefault();
          row.focus();
        }}
      >
        <SheetTitle className="sr-only">{t("Properti Bagian", "Section Properties")}</SheetTitle>
        {section && <PropertiesContent section={section} onUpdate={onUpdate} onDelete={onDelete} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}
