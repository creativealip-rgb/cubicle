"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createPortalComment } from "./portal-comment-form-action";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";

interface PortalCommentFormProps {
  entityType: "project" | "task" | "file";
  entityId: string;
  workspaceId: string;
}

export function PortalCommentForm({
  entityType,
  entityId,
  workspaceId,
}: PortalCommentFormProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    authorName: "",
    authorEmail: "",
    body: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.body.trim() || !form.authorName.trim() || !form.authorEmail.trim()) {
      toast.error("Name, email, and message are required");
      return;
    }
    setLoading(true);
    try {
      await createPortalComment({
        entityType,
        entityId,
        workspaceId,
        authorName: form.authorName,
        authorEmail: form.authorEmail,
        body: form.body,
      });
      toast.success("Comment submitted");
      setForm({ authorName: "", authorEmail: "", body: "" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pname" className="text-xs">
            Your Name *
          </Label>
          <Input
            id="pname"
            value={form.authorName}
            onChange={(e) =>
              setForm((p) => ({ ...p, authorName: e.target.value }))
            }
            placeholder="John Doe"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pemail" className="text-xs">
            Your Email *
          </Label>
          <Input
            id="pemail"
            type="email"
            value={form.authorEmail}
            onChange={(e) =>
              setForm((p) => ({ ...p, authorEmail: e.target.value }))
            }
            placeholder="john@example.com"
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pbody" className="text-xs">
          Message *
        </Label>
        <Textarea
          id="pbody"
          value={form.body}
          onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
          placeholder="Write your message..."
          rows={3}
          required
        />
      </div>
      <Button type="submit" disabled={loading} size="sm" className="gap-1">
        <Send className="h-3.5 w-3.5" />
        {loading ? "Sending..." : "Send"}
      </Button>
    </form>
  );
}
