export type SortDir = "asc" | "desc";

export type SortState<K extends string = string> = {
  key: K | null;
  dir: SortDir | null;
};

export function nextSortState<K extends string>(
  current: SortState<K>,
  key: K,
): SortState<K> {
  if (current.key !== key) return { key, dir: "asc" };
  if (current.dir === "asc") return { key, dir: "desc" };
  return { key: null, dir: null };
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function toComparable(value: unknown): string | number | boolean | null {
  if (isEmpty(value)) return null;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    // ISO / date-like strings → timestamp for natural date sort
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed) || /^\d{4}\/\d{2}\/\d{2}/.test(trimmed)) {
      const t = new Date(trimmed).getTime();
      if (!Number.isNaN(t)) return t;
    }
    const asNum = Number(trimmed);
    if (trimmed !== "" && Number.isFinite(asNum) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
      return asNum;
    }
    return trimmed.toLocaleLowerCase("id");
  }
  return String(value).toLocaleLowerCase("id");
}

export function compareSortValues(
  a: unknown,
  b: unknown,
  dir: SortDir,
  order?: readonly string[],
): number {
  const emptyA = isEmpty(a);
  const emptyB = isEmpty(b);
  // Always push empty values to the bottom, regardless of direction
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;

  if (order && order.length > 0) {
    const sa = String(a);
    const sb = String(b);
    const ia = order.indexOf(sa);
    const ib = order.indexOf(sb);
    const ra = ia === -1 ? order.length : ia;
    const rb = ib === -1 ? order.length : ib;
    const diff = ra - rb;
    return dir === "asc" ? diff : -diff;
  }

  const ca = toComparable(a);
  const cb = toComparable(b);
  if (ca === null && cb === null) return 0;
  if (ca === null) return 1;
  if (cb === null) return -1;

  let diff = 0;
  if (typeof ca === "number" && typeof cb === "number") {
    diff = ca - cb;
  } else if (typeof ca === "boolean" && typeof cb === "boolean") {
    diff = Number(ca) - Number(cb);
  } else {
    diff = String(ca).localeCompare(String(cb), "id", {
      numeric: true,
      sensitivity: "base",
    });
  }
  return dir === "asc" ? diff : -diff;
}

export function sortRows<T, K extends string>(
  rows: readonly T[],
  sort: SortState<K>,
  getters: Record<K, (row: T) => unknown>,
  orders?: Partial<Record<K, readonly string[]>>,
): T[] {
  if (!sort.key || !sort.dir) return [...rows];
  const getter = getters[sort.key];
  if (!getter) return [...rows];
  const order = orders?.[sort.key];
  const indexed = rows.map((row, index) => ({ row, index }));
  indexed.sort((a, b) => {
    const diff = compareSortValues(getter(a.row), getter(b.row), sort.dir!, order);
    return diff !== 0 ? diff : a.index - b.index;
  });
  return indexed.map((x) => x.row);
}
