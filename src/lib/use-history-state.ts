"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export function useHistoryState<T>(initialPresent: T, maxHistory = 30) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialPresent);
  const [future, setFuture] = useState<T[]>([]);

  // Ref to access current values synchronously inside callbacks
  const presentRef = useRef(present);
  presentRef.current = present;
  const pastRef = useRef(past);
  pastRef.current = past;
  const futureRef = useRef(future);
  futureRef.current = future;

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current[pastRef.current.length - 1];
    const newPast = pastRef.current.slice(0, pastRef.current.length - 1);
    
    setPast(newPast);
    setFuture([presentRef.current, ...futureRef.current]);
    setPresent(previous);
  }, []);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[0];
    const newFuture = futureRef.current.slice(1);

    setPast([...pastRef.current, presentRef.current]);
    setFuture(newFuture);
    setPresent(next);
  }, []);

  const set = useCallback(
    (action: T | ((curr: T) => T)) => {
      const current = presentRef.current;
      const next = typeof action === "function" ? (action as (curr: T) => T)(current) : action;

      // Don't record if identical
      if (JSON.stringify(current) === JSON.stringify(next)) {
        return;
      }

      setPast((prev) => [...prev, current].slice(-maxHistory));
      setPresent(next);
      setFuture([]);
    },
    [maxHistory]
  );

  const reset = useCallback((newPresent: T) => {
    setPast([]);
    setPresent(newPresent);
    setFuture([]);
  }, []);

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
