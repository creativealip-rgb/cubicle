"use client";

import { useState, useCallback, useRef } from "react";

export function useHistoryState<T>(initialPresent: T, maxHistory = 30) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialPresent);
  const [future, setFuture] = useState<T[]>([]);

  const presentRef = useRef(present);
  const pastRef = useRef(past);
  const futureRef = useRef(future);

  const commit = useCallback((nextPast: T[], nextPresent: T, nextFuture: T[]) => {
    // Keep callback reads synchronous when multiple history actions share one event.
    pastRef.current = nextPast;
    presentRef.current = nextPresent;
    futureRef.current = nextFuture;
    setPast(nextPast);
    setPresent(nextPresent);
    setFuture(nextFuture);
  }, []);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current[pastRef.current.length - 1];
    commit(
      pastRef.current.slice(0, -1),
      previous,
      [presentRef.current, ...futureRef.current],
    );
  }, [commit]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[0];
    commit(
      [...pastRef.current, presentRef.current],
      next,
      futureRef.current.slice(1),
    );
  }, [commit]);

  const set = useCallback(
    (action: T | ((curr: T) => T)) => {
      const current = presentRef.current;
      const next = typeof action === "function" ? (action as (curr: T) => T)(current) : action;

      if (JSON.stringify(current) === JSON.stringify(next)) return;

      commit([...pastRef.current, current].slice(-maxHistory), next, []);
    },
    [commit, maxHistory],
  );

  const reset = useCallback((newPresent: T) => {
    commit([], newPresent, []);
  }, [commit]);

  return {
    state: present,
    set,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    pastLength: past.length,
    futureLength: future.length,
  };
}
