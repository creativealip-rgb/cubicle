"use client";

import {
  createContext,
  useCallback,
  useContext,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

interface TransitionContextValue {
  /** True while a router.refresh() transition is in flight. */
  isPending: boolean;
  /** Wraps router.refresh() in a React transition so the app can show a loading state. */
  refresh: () => void;
}

const TransitionContext = createContext<TransitionContextValue | null>(null);

/**
 * Single shared transition source. Forms and dialogs call `refresh()` after a
 * mutation instead of `router.refresh()` directly; a thin top progress bar
 * (rendered in AppShell) lights up while the server re-renders the list.
 */
export function TransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition]);

  return (
    <TransitionContext.Provider value={{ isPending, refresh }}>
      {children}
    </TransitionContext.Provider>
  );
}

/**
 * Returns the shared transition source when inside <TransitionProvider>, or a
 * self-contained local transition when rendered outside it (login, onboarding).
 * This keeps a single call-site API (`const { refresh } = useAppTransition()`)
 * safe to use anywhere without a provider.
 */
export function useAppTransition(): TransitionContextValue {
  const ctx = useContext(TransitionContext);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Fallback refresh for components rendered outside the AppShell provider.
  const localRefresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition]);

  if (ctx) return ctx;
  return { isPending, refresh: localRefresh };
}
