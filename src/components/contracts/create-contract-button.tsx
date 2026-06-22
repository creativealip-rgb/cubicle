"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { createContract } from "@/lib/actions/contracts";

const DEFAULT_BODY = `# Service Agreement

This agreement is between **{{workspace.name}}** ("Provider") and **{{client.name}}** ("Client").

## 1. Scope of work

[Describe what you'll deliver.]

## 2. Timeline

Work to commence on {{today}}. Target completion: [date].

## 3. Payment

Total project fee as agreed in the proposal. Payment terms: 50% upfront, 50% on delivery.

## 4. Confidentiality

Both parties agree to keep all proprietary information confidential.

## 5. Termination

Either party may terminate this agreement with 14 days written notice. Work completed to date will be billed proportionally.

## 6. Acceptance

By signing below, both parties agree to the terms outlined above.
`;

export function CreateContractButton({ clients, workspaceId }: { clients: { id: string; name: string }[]; workspaceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [validUntil, setValidUntil] = useState("");
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    if (!clientId) {
      alert("Pick a client first");
      return;
    }
    if (!title.trim()) {
      alert("Please give the contract a title");
      return;
    }
    startTransition(async () => {
      try {
        const c = await createContract({
          workspaceId,
          clientId,
          title: title.trim(),
          body,
          validUntil: validUntil || undefined,
        });
        setOpen(false);
        router.push(`/app/contracts/${c.id}`);
      } catch (err: any) {
        alert(err?.message || "Create failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          New contract
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New contract</DialogTitle>
          <DialogDescription>
            Start from a template. Edit the body. Send to a client for e-signature.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">Client</label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Title</label>
            <Input
              placeholder="e.g. Service Agreement — Brand refresh"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Valid until (optional)</label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              Body
              <span className="text-xs text-slate-500 ml-2">
                Use {`{{client.name}}`}, {`{{workspace.name}}`}, {`{{today}}`}, {`{{valid_until}}`}
              </span>
            </label>
            <Textarea
              rows={16}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
