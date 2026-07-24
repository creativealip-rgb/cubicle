"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClientForm } from "@/components/forms/client-form";

interface ClientEditDialogProps {
  defaultValues: {
    id: string;
    clientNumber?: string | null;
    name?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    tags?: string[];
    internalNotes?: string;
    portalSlug?: string;
    portalSlugEnabled?: boolean;
    portalEnabled?: boolean;
  };
}

export function ClientEditDialog({ defaultValues }: ClientEditDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Pencil className="h-3 w-3" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(90dvh,720px)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12 text-left">
          <DialogTitle>Ubah Klien</DialogTitle>
          <DialogDescription>
            Perbarui data kontak, alamat, dan link portal klien.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ClientForm
            mode="edit"
            defaultValues={defaultValues}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
