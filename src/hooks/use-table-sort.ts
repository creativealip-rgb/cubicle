"use client";

import { useCallback, useMemo, useState } from "react";
import {
  nextSortState,
  sortRows,
  type SortDir,
  type SortState,
} from "@/lib/table-sort";

export function useTableSort<T, K extends string>(
  rows: readonly T[],
  getters: Record<K, (row: T) => unknown>,
  orders?: Partial<Record<K, readonly string[]>>,
) {
  const [sort, setSort] = useState<SortState<K>>({ key: null, dir: null });

  const sorted = useMemo(
    () => sortRows(rows, sort, getters, orders),
    [rows, sort, getters, orders],
  );

  const toggle = useCallback((key: K) => {
    setSort((prev) => nextSortState(prev, key));
  }, []);

  const dirFor = useCallback(
    (key: K): SortDir | null => (sort.key === key ? sort.dir : null),
    [sort],
  );

  return { sorted, sort, toggle, dirFor };
}
