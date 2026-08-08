"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface LoadingButtonProps extends ButtonProps {
  /** Show spinner + disable button */
  loading?: boolean;
  /** Optional text to show when loading (replaces children) */
  loadingText?: string;
}

/**
 * Standardized loading button.
 * - Shows Loader2 spinner when `loading` is true
 * - Disables button when loading
 * - Optionally swaps text via `loadingText`
 * - Adds aria-busy for accessibility
 */
const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading = false, loadingText, children, disabled, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(className)}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading && loadingText ? loadingText : children}
      </Button>
    );
  },
);
LoadingButton.displayName = "LoadingButton";

export { LoadingButton };
