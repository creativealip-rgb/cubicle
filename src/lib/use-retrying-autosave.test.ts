/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AutosaveSaveError,
  isTransientSaveError,
  saveErrorIssuePaths,
  useRetryingAutosave,
} from "./use-retrying-autosave";

/** Advance fake timers and flush the microtasks a resolved/rejected save needs. */
async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const DELAYS = [1000, 2000, 4000] as const;

function mount(value: unknown, save: (v: unknown) => Promise<void>) {
  return renderHook(
    ({ v }: { v: unknown }) =>
      useRetryingAutosave({
        value: v,
        save: save as never,
        debounceMs: 2000,
        retryDelaysMs: DELAYS,
      }),
    { initialProps: { v: value } },
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useRetryingAutosave", () => {
  it("starts idle and clean for the initial value", () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = mount({ a: 1 }, save);
    expect(result.current.status).toBe("idle");
    expect(result.current.isDirty).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });

  it("moves pending -> saved on success and clears dirty", async () => {
    vi.useFakeTimers();
    const d = deferred<void>();
    const save = vi.fn().mockReturnValue(d.promise);
    const { result, rerender } = mount({ a: 1 }, save);

    rerender({ v: { a: 2 } });
    expect(result.current.isDirty).toBe(true);
    expect(result.current.status).toBe("idle");

    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(result.current.status).toBe("pending");
    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => { d.resolve(); await Promise.resolve(); });
    expect(result.current.status).toBe("saved");
    expect(result.current.isDirty).toBe(false);
  });

  it("retries transient failures with bounded backoff then fails", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockRejectedValue(new Error("network boom"));
    const { result, rerender } = mount({ a: 1 }, save);

    rerender({ v: { a: 2 } });
    await advance(2000); // attempt 1 fails -> retrying
    expect(result.current.status).toBe("retrying");
    expect(save).toHaveBeenCalledTimes(1);

    await advance(1000); // retry after 1s
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("retrying");

    await advance(2000); // retry after 2s
    expect(save).toHaveBeenCalledTimes(3);

    await advance(4000); // retry after 4s -> exhausted
    expect(save).toHaveBeenCalledTimes(4);
    expect(result.current.status).toBe("failed");
    expect(result.current.error).toContain("network boom");
    expect(result.current.isDirty).toBe(true);

    await advance(60000); // bounded: no further attempts
    expect(save).toHaveBeenCalledTimes(4);
  });

  it("never retries a validation failure and surfaces the field path", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockRejectedValue(
      new AutosaveSaveError("Periksa field", {
        issuePaths: [["pages", 0, "sections", 3, "alt"]],
        retryable: false,
      }),
    );
    const { result, rerender } = mount({ a: 1 }, save);

    rerender({ v: { a: 2 } });
    await advance(2000);
    expect(result.current.status).toBe("failed");
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.issuePaths).toEqual([["pages", 0, "sections", 3, "alt"]]);

    await advance(60000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("treats slug-taken as terminal and maps it to the slug path", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockRejectedValue(new Error("PERSONAL_SITE_SLUG_TAKEN"));
    const { result, rerender } = mount({ a: 1 }, save);

    rerender({ v: { a: 2 } });
    await advance(2000);
    expect(result.current.status).toBe("failed");
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.issuePaths).toEqual([["slug"]]);

    await advance(60000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("keeps dirty state after a failure and recovers via retry()", async () => {
    vi.useFakeTimers();
    const save = vi.fn()
      .mockRejectedValueOnce(new AutosaveSaveError("bad", { retryable: false }))
      .mockResolvedValueOnce(undefined);
    const { result, rerender } = mount({ a: 1 }, save);

    rerender({ v: { a: 2 } });
    await advance(2000);
    expect(result.current.status).toBe("failed");
    expect(result.current.isDirty).toBe(true);

    act(() => { result.current.retry(); });
    expect(result.current.status).toBe("pending");
    await act(async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); });
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("saved");
    expect(result.current.isDirty).toBe(false);
  });

  it("reports failures through onError with the field paths", async () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    const save = vi.fn().mockRejectedValue(new AutosaveSaveError("bad", { issuePaths: [["title"]], retryable: false }));
    const { rerender } = renderHook(
      ({ v }: { v: unknown }) =>
        useRetryingAutosave({ value: v, save: save as never, debounceMs: 2000, retryDelaysMs: DELAYS, onError }),
      { initialProps: { v: { a: 1 } } },
    );

    rerender({ v: { a: 2 } });
    await advance(2000);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][1]).toEqual([["title"]]);
  });
});

describe("transient classification", () => {
  it("classifies terminal vs transient errors", () => {
    expect(isTransientSaveError(new Error("boom"))).toBe(true);
    expect(isTransientSaveError(new Error("PERSONAL_SITE_SLUG_TAKEN"))).toBe(false);
    expect(isTransientSaveError(new AutosaveSaveError("x", { retryable: false }))).toBe(false);
    expect(isTransientSaveError(new AutosaveSaveError("x", { retryable: true }))).toBe(true);
  });

  it("extracts issue paths, defaulting slug-taken to the slug path", () => {
    expect(saveErrorIssuePaths(new AutosaveSaveError("x", { issuePaths: [["pages", 1]] }))).toEqual([["pages", 1]]);
    expect(saveErrorIssuePaths(new Error("PERSONAL_SITE_SLUG_TAKEN"))).toEqual([["slug"]]);
    expect(saveErrorIssuePaths(new Error("plain"))).toEqual([]);
  });
});
