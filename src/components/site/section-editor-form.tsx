"use client";

import { useState } from "react";
import { SectionEditor } from "./section-editor";
import type { PersonalSiteSection } from "@/lib/personal-site/model";

/** Client wrapper kept for compatibility with server-component callers. */
export function SectionEditorForm({ initialSections }: { initialSections: PersonalSiteSection[] }) {
  const [sections, setSections] = useState<PersonalSiteSection[]>(initialSections);
  return <SectionEditor sections={sections} onChange={setSections} />;
}
