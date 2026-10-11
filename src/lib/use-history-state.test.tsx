/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useHistoryState } from "@/lib/use-history-state";

describe("useHistoryState", () => {
  it("composes consecutive functional updates in one event", () => {
    const { result } = renderHook(() => useHistoryState(0));

    act(() => {
      result.current.set((value) => value + 1);
      result.current.set((value) => value + 1);
    });

    expect(result.current.state).toBe(2);
    expect(result.current.pastLength).toBe(2);
  });

  it("keeps consecutive undo and redo actions synchronous", () => {
    const { result } = renderHook(() => useHistoryState(0));

    act(() => {
      result.current.set(1);
      result.current.set(2);
      result.current.set(3);
    });
    act(() => {
      result.current.undo();
      result.current.undo();
    });
    expect(result.current.state).toBe(1);
    expect(result.current.futureLength).toBe(2);

    act(() => {
      result.current.redo();
      result.current.redo();
    });
    expect(result.current.state).toBe(3);
    expect(result.current.pastLength).toBe(3);
  });
});
