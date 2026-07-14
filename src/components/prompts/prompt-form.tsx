"use client";

import { useState, useCallback, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { generatePrompt, getTemplateVariables } from "@/lib/actions/prompts";
import { Loader2, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import type { promptTemplates } from "@/db/schema";

type Template = typeof promptTemplates.$inferSelect;

export function PromptForm({
  templates,
  // eslint-disable-next-line unused-imports/no-unused-vars
  workspaceId,
}: {
  templates: Template[];
  projects?: { id: string; name: string }[];
  workspaceId: string;
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [varList, setVarList] = useState<string[]>([]);
  const [output, setOutput] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [_saving, _setSaving] = useState(false);
  const [_generationId, setGenerationId] = useState<string | null>(null);

  const handleTemplateChange = useCallback(
    async (templateId: string) => {
      setSelectedTemplateId(templateId);
      setOutput("");
      setVariables({});

      if (!templateId) return;

      try {
        const vars = await getTemplateVariables(templateId);
        setVarList(vars);
        const initial: Record<string, string> = {};
        vars.forEach((v) => {
          initial[v] = "";
        });
        setVariables(initial);
      } catch {
        toast.error("Failed to load template variables");
      }
    },
    []
  );

  const [_state, formAction, isPending] = useActionState(
    async (_prev: unknown, _formData: FormData) => {
      if (!selectedTemplateId) {
        toast.error("Please select a template");
        return null;
      }

      try {
        const result = await generatePrompt({
          templateId: selectedTemplateId,
          input: variables,
          model: "ag/gemini-pro-agent",
        });
        setOutput(result.generation.generatedOutput ?? "");
        setGenerationId(result.generation.id);
        toast.success("Prompt generated!");
        return result;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Generation failed");
        return null;
      }
    },
    null
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("Disalin ke clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="space-y-4">
      {/* Template selector */}
      <div className="space-y-2">
        <Label>Template</Label>
        <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih template..." />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <div className="flex items-center gap-2">
                  <span>{t.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {t.category}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTemplate?.description && (
          <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
        )}
      </div>

      {/* Dynamic input fields */}
      {varList.length > 0 && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">Variables</p>
          {varList.map((varName) => (
            <div key={varName} className="space-y-1">
              <Label className="text-xs capitalize">{varName.replace(/_/g, " ")}</Label>
              <Input
                placeholder={`Enter ${varName}...`}
                value={variables[varName] ?? ""}
                onChange={(e) =>
                  setVariables((prev) => ({ ...prev, [varName]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
      )}

      {/* Generate button */}
      <form action={formAction}>
        <Button type="submit" disabled={isPending || !selectedTemplateId} className="gap-2">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isPending ? "Generating..." : "Generate"}
        </Button>
      </form>

      {/* Output */}
      {output && (
        <div className="space-y-3">
          <Label>Output</Label>
          <div className="relative">
            <Textarea
              value={output}
              readOnly
              rows={8}
              className="font-mono text-sm resize-y"
            />
            <div className="absolute right-2 top-2 flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
