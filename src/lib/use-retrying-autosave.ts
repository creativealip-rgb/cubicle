"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "pending" | "saved" | "failed" | "retrying";

/** Zod-style issue path, e.g. ["pages", 0, "sections", 3, "alt"]. */
export type AutosaveIssuePath = (string | number)[];

/**
 * Thrown by a save adapter to carry the offending field paths and to classify
 * the failure. `retryable: false` (validation, slug taken, readiness refusal)
 * is terminal — retrying a deterministic rejection only delays the truth.
 */
export class AutosaveSaveError extends Error {
  readonly issuePaths: AutosaveIssuePath[];
  readonly retryable: boolean;

  constructor(
    message: string,
    options: { issuePaths?: AutosaveIssuePath[]; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = "AutosaveSaveError";
    this.issuePaths = options.issuePaths ?? [];
    this.retryable = options.retryable ?? false;
  }
}

/** Server sentinels that a retry can never fix. */
const TERMINAL_MESSAGES = new Set(["PERSONAL_SITE_SLUG_TAKEN", "PERSONAL_SITE_STALE_REVISION"]);

/** Transient = worth retrying; terminal = never retry. */
export function isTransientSaveError(error: unknown): boolean {
  if (error instanceof AutosaveSaveError) return error.retryable;
  if (error instanceof Error && TERMINAL_MESSAGES.has(error.message)) return false;
  // Unknown errors (network/transport) are treated as transient.
  return true;
}

export function saveErrorIssuePaths(error: unknown): AutosaveIssuePath[] {
  if (error instanceof AutosaveSaveError) return error.issuePaths;
  if (error instanceof Error && error.message === "PERSONAL_SITE_SLUG_TAKEN") return [["slug"]];
  return [];
}

export const DEFAULT_AUTOSAVE_DEBOUNCE_MS = 2000;
/** Bounded exponential backoff: 1s, 2s, 4s, then stop (4 attempts total). */
export const DEFAULT_AUTOSAVE_RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

const defaultSerialize = (value: unknown) => JSON.stringify(value);

export type UseRetryingAutosaveOptions<T> = {
  value: T;
  save: (value: T) => Promise<void>;
  /** Debounce before the first attempt. Default 2000ms. */
  debounceMs?: number;
  /** Delay before each retry; its length bounds the retry count. Default [1000, 2000, 4000]. */
  retryDelaysMs?: readonly number[];
  serialize?: (value: T) => string;
  isRetryable?: (error: unknown) => boolean;
  onError?: (error: unknown, issuePaths: AutosaveIssuePath[]) => void;
};

export type RetryingAutosave = {
  status: AutosaveStatus;
  error: string | null;
  issuePaths: AutosaveIssuePath[];
  isDirty: boolean;
  /** Persistent manual retry (used by the always-visible Retry action). */
  retry: () => void;
  /** Record an externally-persisted value (manual save / publish) as saved. */
  markSaved: (value?: unknown) => void;
};

export function useRetryingAutosave<T>({
  value,
  save,
  debounceMs = DEFAULT_AUTOSAVE_DEBOUNCE_MS,
  retryDelaysMs = DEFAULT_AUTOSAVE_RETRY_DELAYS_MS,
  serialize = defaultSerialize,
  isRetryable = isTransientSaveError,
  onError,
}: UseRetryingAutosaveOptions<T>): RetryingAutosave {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [issuePaths, setIssuePaths] = useState<AutosaveIssuePath[]>([]);

  const serialized = useMemo(() => serialize(value), [value, serialize]);
  // State, not a ref: the "last persisted value" genuinely drives what is
  // rendered (isDirty), and mount must not look unsaved.
  const [savedSerialized, setSavedSerialized] = useState(() => serialize(value));

  // Latest props for the async save loop, so `runSave` can stay referentially
  // stable while still observing the newest value/save. Synced in an effect
  // rather than during render.
  const latestRef = useRef({ value, save, serialize, isRetryable, onError, retryDelaysMs });
  useEffect(() => {
    latestRef.current = { value, save, serialize, isRetryable, onError, retryDelaysMs };
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  // The retry path re-enters runSave(), which cannot reference itself before it
  // is declared — so it goes through this ref instead.
  const runSaveRef = useRef<() => Promise<void>>(async () => {});

  const runSave = useCallback(async () => {
    const { value: current, serialize: currentSerialize, save: currentSave } = latestRef.current;
    const currentSerialized = currentSerialize(current);
    setStatus("pending");
    try {
      await currentSave(current);
      setSavedSerialized(currentSerialized);
      attemptRef.current = 0;
      setError(null);
      setIssuePaths([]);
      setStatus("saved");
    } catch (err) {
      const { isRetryable: isRetryableNow, onError: onErrorNow, retryDelaysMs: delays } = latestRef.current;
      const paths = saveErrorIssuePaths(err);
      setError(err instanceof Error ? err.message : String(err));
      setIssuePaths(paths);
      // Bounded backoff: each failed attempt consumes one delay; the length of
      // the delay list bounds how many retries happen before giving up.
      if (isRetryableNow(err) && attemptRef.current < delays.length) {
        const delay = delays[attemptRef.current];
        attemptRef.current += 1;
        setStatus("retrying");
        timerRef.current = setTimeout(() => { void runSaveRef.current(); }, delay);
        return;
      }
      setStatus("failed");
      onErrorNow?.(err, paths);
    }
  }, []);

  // Keep the retry re-entry point in sync — an effect, never a render-time write.
  useEffect(() => { runSaveRef.current = runSave; }, [runSave]);

  const retry = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    attemptRef.current = 0;
    void runSave();
  }, [runSave]);

  const markSaved = useCallback((savedValue?: unknown) => {
    const { serialize: currentSerialize, value: current } = latestRef.current;
    setSavedSerialized(currentSerialize((savedValue ?? current) as T));
    attemptRef.current = 0;
    setError(null);
    setIssuePaths([]);
    setStatus("saved");
  }, []);

  // Debounced autosave: fires only while the value differs from the last save.
  // A new edit resets the attempt budget, so a fresh change retries from scratch.
  useEffect(() => {
    if (serialized === savedSerialized) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    attemptRef.current = 0;
    timerRef.current = setTimeout(() => { void runSave(); }, debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [serialized, savedSerialized, debounceMs, runSave]);

  const isDirty = serialized !== savedSerialized;

  return { status, error, issuePaths, isDirty, retry, markSaved };
}
