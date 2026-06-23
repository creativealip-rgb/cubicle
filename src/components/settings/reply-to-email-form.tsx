"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";

export function ReplyToEmailForm({
  workspaceId,
  currentValue,
}: {
  workspaceId: string;
  currentValue: string | null;
}) {
  const [email, setEmail] = useState(currentValue ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const res = await fetch("/api/settings/reply-to", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, replyToEmail: email.trim() || null }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        type="email"
        placeholder="your-email@gmail.com"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setSaved(false); }}
        className="max-w-xs"
      />
      <Button size="sm" onClick={handleSave} disabled={pending}>
        {pending ? "Saving..." : saved ? "Saved ✓" : "Save"}
      </Button>
    </div>
  );
}
