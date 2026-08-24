import { useCallback, useEffect, useState } from "react";

export type Row = Record<string, any> & { id: string };

const PREFIX = "wcert.fsms.";
const listeners: Record<string, Set<() => void>> = {};
const cache: Record<string, Row[]> = {};

function storageKey(name: string) {
  return PREFIX + name;
}

function load(name: string, seed: Row[]): Row[] {
  if (cache[name]) return cache[name];
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(storageKey(name));
    cache[name] = raw ? (JSON.parse(raw) as Row[]) : seed;
  } catch {
    cache[name] = seed;
  }
  return cache[name];
}

function save(name: string, rows: Row[]) {
  cache[name] = rows;
  try {
    window.localStorage.setItem(storageKey(name), JSON.stringify(rows));
  } catch {
    /* ignore quota errors – demo only */
  }
  listeners[name]?.forEach((fn) => fn());
}

function subscribe(name: string, fn: () => void) {
  listeners[name] ??= new Set();
  listeners[name].add(fn);
  return () => {
    listeners[name]!.delete(fn);
  };

}

export function newId(prefix = "R") {
  return `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

/**
 * Bộ lưu trữ CRUD phía trình duyệt (localStorage) – dùng cho bản demo.
 */
export function useCollection(name: string, seed: Row[]) {
  const [rows, setRows] = useState<Row[]>(seed);

  useEffect(() => {
    setRows(load(name, seed));
    return subscribe(name, () => setRows([...load(name, seed)]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const create = useCallback(
    (row: Omit<Row, "id"> & { id?: string }) => {
      const item = { ...row, id: row.id?.trim() || newId() } as Row;
      save(name, [item, ...load(name, seed)]);
      return item;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name],
  );

  const update = useCallback(
    (id: string, patch: Partial<Row>) => {
      save(
        name,
        load(name, seed).map((r) => (r.id === id ? { ...r, ...patch } : r)),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name],
  );

  const remove = useCallback(
    (id: string) => {
      save(
        name,
        load(name, seed).filter((r) => r.id !== id),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name],
  );

  const reset = useCallback(() => {
    save(name, seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, seed]);

  return { rows, create, update, remove, reset };
}
