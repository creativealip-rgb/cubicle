"use client";

import { useState, useCallback, useRef, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ConfirmOptions {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

/**
 * Hook to replace window.confirm() usage.
 *
 * Usage:
 * ```tsx
 * const { confirm, dialog } = useConfirm();
 *
 * async function handleDelete() {
 *   const ok = await confirm({
 *     title: "Hapus item?",
 *     description: "Item akan dihapus permanen.",
 *     confirmLabel: "Hapus",
 *     destructive: true,
 *   });
 *   if (ok) { ... }
 * }
 *
 * return (
 *   <>
 *     <Button onClick={handleDelete}>Delete</Button>
 *     {dialog}
 *   </>
 * );
 * ```
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: "",
    description: "",
  });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        resolveRef.current = resolve;
        setState({
          ...options,
          open: true,
        });
      });
    },
    [],
  );

  const handleConfirm = useCallback(async () => {
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      resolveRef.current?.(false);
      resolveRef.current = null;
    }
    setState((prev) => ({ ...prev, open }));
  }, []);

  const dialog = (
    <ConfirmDialog
      open={state.open}
      onOpenChange={handleOpenChange}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      onConfirm={handleConfirm}
      destructive={state.destructive}
    />
  );

  return { confirm, dialog };
}
