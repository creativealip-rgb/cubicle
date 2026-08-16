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

const TransitionContext = createContext<TransitionContextValue>({
  isPending: false,
  refresh: () => {},
});

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

export function useAppTransition() {
  return useContext(TransitionContext);
}
