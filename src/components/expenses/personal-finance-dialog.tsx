"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PersonalFinanceDialog({
  trigger,
  title,
  description,
  children,
}: {
  trigger: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl">{trigger}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88dvh] w-[calc(100%-2rem)] max-w-xl flex flex-col rounded-2xl p-6 overflow-y-auto">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="pt-2 pb-6">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
