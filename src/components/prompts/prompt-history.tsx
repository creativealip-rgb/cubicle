"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteGeneration } from "@/lib/actions/prompts";
import { Clock, Trash2, FileText, FolderOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Generation {
  id: string;
  templateId: string | null;
  templateName: string | null;
  generatedOutput: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: string | null;
  projectId: string | null;
  projectName: string | null;
  createdAt: Date | string;
}

export function PromptHistory({
  generations: initialGenerations,
}: {
  generations: Generation[];
}) {
  const [generations, setGenerations] = useState(initialGenerations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await deleteGeneration(id);
      setGenerations((prev) => prev.filter((g) => g.id !== id));
      if (selectedId === id) setSelectedId(null);
      toast.success("Generation dihapus");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const selected = generations.find((g) => g.id === selectedId);

  function formatDate(d: string | Date): string {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (generations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileText className="mb-2 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No generations yet</p>
        <p className="text-xs text-muted-foreground">
          Select a template and generate your first prompt
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {generations.map((gen) => (
        <div key={gen.id}>
          <div
            className="flex cursor-pointer items-start justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors"
            onClick={() => setSelectedId(selectedId === gen.id ? null : gen.id)}
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">
                  {gen.templateName || "Custom"}
                </p>
                {gen.model && (
                  <Badge variant="secondary" className="text-[10px]">
                    {gen.model}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDate(gen.createdAt)}
                {gen.projectName && (
                  <>
                    <FolderOpen className="h-3 w-3" />
                    {gen.projectName}
                  </>
                )}
              </div>
              {gen.costUsd && Number(gen.costUsd) > 0 && (
                <p className="text-xs text-muted-foreground">
                  ${Number(gen.costUsd).toFixed(4)} · {gen.inputTokens ?? 0}+{gen.outputTokens ?? 0} tokens
                </p>
              )}
              {/* Preview of output */}
              {gen.generatedOutput && (
                <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                  {gen.generatedOutput.substring(0, 80)}...
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 ml-2"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(gen.id);
              }}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
          </div>

          {/* Expanded view */}
          {selectedId === gen.id && selected && (
            <div className="mt-2 rounded-lg border bg-muted/20 p-3">
              <pre className="whitespace-pre-wrap text-xs font-mono">
                {selected.generatedOutput}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
