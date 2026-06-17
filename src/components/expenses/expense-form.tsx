"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createExpense } from "@/lib/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";

export interface CategoryOption {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

export interface ProjectOption {
  id: string;
  name: string;
}

export interface ClientOption {
  id: string;
  name: string;
}

interface ExpenseFormProps {
  workspaceId: string;
  defaultCurrency: string;
  categories: CategoryOption[];
  projects: ProjectOption[];
  clients: ClientOption[];
  onSuccess?: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function ExpenseForm({
  workspaceId,
  defaultCurrency,
  categories,
  projects,
  clients,
  onSuccess,
  onCancel,
  compact = false,
}: ExpenseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    currency: defaultCurrency,
    description: "",
    categoryId: "",
    projectId: "",
    clientId: "",
    vendor: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    setLoading(true);
    try {
      await createExpense({
        workspaceId,
        amount: parseFloat(form.amount),
        currency: form.currency,
        date: form.date,
        description: form.description,
        categoryId: form.categoryId || undefined,
        projectId: form.projectId || undefined,
        clientId: form.clientId || undefined,
        vendor: form.vendor || undefined,
        taxIncluded: false,
      });
      toast.success("Expense added");
      setForm({
        date: new Date().toISOString().split("T")[0],
        amount: "",
        currency: defaultCurrency,
        description: "",
        categoryId: "",
        projectId: "",
        clientId: "",
        vendor: "",
      });
      router.refresh();
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const gridCols = compact ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={`grid gap-3 ${gridCols}`}>
        <div className="space-y-1">
          <Label htmlFor="date" className="text-xs">Date</Label>
          <Input
            id="date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="amount" className="text-xs">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0.00"
            required
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="currency" className="text-xs">Currency</Label>
          <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
            <SelectTrigger id="currency" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IDR">IDR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="SGD">SGD</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="category" className="text-xs">Category</Label>
          <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
            <SelectTrigger id="category" className="h-9">
              <SelectValue placeholder="Pick one" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className={`space-y-1 ${compact ? "col-span-2" : ""}`}>
          <Label htmlFor="description" className="text-xs">Description</Label>
          <Input
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What was this for?"
            required
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vendor" className="text-xs">Vendor (optional)</Label>
          <Input
            id="vendor"
            value={form.vendor}
            onChange={(e) => setForm({ ...form, vendor: e.target.value })}
            placeholder="e.g. Figma, Grab"
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="project" className="text-xs">Project (optional)</Label>
          <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
            <SelectTrigger id="project" className="h-9">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="client" className="text-xs">Client (optional)</Label>
          <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
            <SelectTrigger id="client" className="h-9">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          {loading ? "Adding..." : "Add expense"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
