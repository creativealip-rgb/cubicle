"use client";

import { useState } from "react";
import { SectionEditor, type SiteSection } from "./section-editor";

/**
 * Client wrapper for SectionEditor that manages its own state.
 * Use this in Server Components — pass initialSections (serializable)
 * instead of trying to pass onChange across the server/client boundary.
 */
export function SectionEditorForm({ initialSections }: { initialSections: SiteSection[] }) {
  const [sections, setSections] = useState<SiteSection[]>(initialSections);

  return <SectionEditor sections={sections} onChange={setSections} />;
}
