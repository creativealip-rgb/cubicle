"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronUp, ChevronDown, Copy } from "lucide-react";

export type SiteSection = {
  id: string;
  type: string;
  heading: string;
  content: string;
};

const sectionTypes = [
  { value: "services", label: "Services" },
  { value: "process", label: "Process" },
  { value: "pricing", label: "Pricing" },
  { value: "portfolio", label: "Portfolio" },
  { value: "testimonials", label: "Testimonials" },
  { value: "faq", label: "FAQ" },
  { value: "contact", label: "Contact" },
  { value: "custom", label: "Custom" },
];

interface SectionEditorProps {
  sections: SiteSection[];
  onChange: (sections: SiteSection[]) => void;
}

export function SectionEditor({ sections, onChange }: SectionEditorProps) {
  const addSection = () => {
    const newSection: SiteSection = {
      id: Date.now().toString(),
      type: "custom",
      heading: "New Section",
      content: "",
    };
    onChange([...sections, newSection]);
  };

  const removeSection = (id: string) => {
    onChange(sections.filter((s) => s.id !== id));
  };

  const duplicateSection = (id: string) => {
    const section = sections.find((s) => s.id === id);
    if (!section) return;
    const newSection: SiteSection = {
      ...section,
      id: Date.now().toString(),
      heading: `${section.heading} (copy)`,
    };
    const index = sections.findIndex((s) => s.id === id);
    const newSections = [...sections];
    newSections.splice(index + 1, 0, newSection);
    onChange(newSections);
  };

  const moveSection = (id: string, direction: "up" | "down") => {
    const index = sections.findIndex((s) => s.id === id);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === sections.length - 1) return;

    const newSections = [...sections];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    onChange(newSections);
  };

  const updateSection = (id: string, updates: Partial<SiteSection>) => {
    onChange(sections.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Sections</label>
        <Button type="button" variant="outline" size="sm" onClick={addSection} className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          Add section
        </Button>
      </div>

      <div className="space-y-2">
        {sections.map((section, index) => (
          <div key={section.id} className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Select
                value={section.type}
                onValueChange={(value) => updateSection(section.id, { type: value })}
              >
                <SelectTrigger className="w-[130px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sectionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={section.heading}
                onChange={(e) => updateSection(section.id, { heading: e.target.value })}
                placeholder="Section heading"
                className="h-8 flex-1"
              />

              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveSection(section.id, "up")}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveSection(section.id, "down")}
                  disabled={index === sections.length - 1}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => duplicateSection(section.id)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeSection(section.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <Textarea
              value={section.content}
              onChange={(e) => updateSection(section.id, { content: e.target.value })}
              placeholder="Section content..."
              rows={3}
            />
          </div>
        ))}
      </div>

      {sections.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No sections yet. Click &quot;Add section&quot; to get started.
        </p>
      )}

      {/* Hidden input to store sections as JSON */}
      <input type="hidden" name="sections" value={JSON.stringify(sections)} />
    </div>
  );
}
