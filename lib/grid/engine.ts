import type { ReactNode } from "react";

/** The grid engine: sort, filter and group rows the way a view template says. Pure functions, no React. */

export type FieldType = "TEXT" | "STATUS" | "BOOLEAN" | "DATE" | "NUMBER";
export type Dir = "asc" | "desc";

export interface GridFieldInfo {
  key: string;
  label: string;
  type: FieldType;
  groupable: boolean;
}

export interface GridInfo {
  key: string;
  label: string;
  audience: string[];
  fields: GridFieldInfo[];
}

export interface ColumnConfig {
  key: string;
  visible: boolean;
  pinned: boolean;
  /** Pixels, set by dragging the column edge. Missing = the grid's own width. */
  width?: number;
}
export interface SortConfig {
  key: string;
  dir: Dir;
}
/** op: contains (text) · in (status, value = string[]) · is (boolean) · lastDays (date, value = number) · range (date: {from,to} ISO dates; number: {min,max}) */
export interface FilterConfig {
  key: string;
  op: "contains" | "in" | "is" | "lastDays" | "range";
  value: unknown;
}
export type Density = "comfortable" | "compact";
export interface ViewConfig {
  columns: ColumnConfig[];
  sorts: SortConfig[];
  filters: FilterConfig[];
  groupBy: string | null;
  density: Density;
  pageSize: number;
}

export interface ShareInfo {
  role: string | null;
  userId: string | null;
  userName: string | null;
  makeDefault: boolean;
}
export interface ViewTemplate {
  id: string;
  name: string;
  grid: string;
  config: ViewConfig;
  updatedById: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
  shares: ShareInfo[];
}
export interface AvailableViews {
  templates: ViewTemplate[];
  defaultId: string | null;
}

export type Cell = string | number | boolean | null;

/** How one field behaves in a grid: how to show it, and the plain value used to sort, filter and group. */
export interface ColumnDef<T> {
  key: string;
  label: string;
  type: FieldType;
  groupable?: boolean;
  /** Relative width in the grid (default 1). */
  width?: number;
  render: (row: T) => ReactNode;
  value: (row: T) => Cell;
  /** Status fields: the choices to filter by, as {value (what value() returns), label}. */
  options?: { value: string; label: string }[];
  /** Text for a group header when the value is not itself readable (booleans, status codes). */
  groupLabel?: (value: Cell) => string;
}

export function builtInConfig<T>(defs: ColumnDef<T>[], sorts: SortConfig[] = []): ViewConfig {
  return { columns: defs.map((d) => ({ key: d.key, visible: true, pinned: false })), sorts, filters: [], groupBy: null, density: "comfortable", pageSize: 20 };
}

/** Keeps a template usable when the grid has gained or lost fields since it was saved. Returns the fields it had to drop. */
export function reconcile<T>(config: ViewConfig, defs: ColumnDef<T>[]): { config: ViewConfig; dropped: string[] } {
  const known = new Set(defs.map((d) => d.key));
  const dropped = [
    ...config.columns.filter((c) => !known.has(c.key)).map((c) => c.key),
    ...config.sorts.filter((s) => !known.has(s.key)).map((s) => s.key),
    ...config.filters.filter((f) => !known.has(f.key)).map((f) => f.key),
    ...(config.groupBy && !known.has(config.groupBy) ? [config.groupBy] : []),
  ];
  const columns = config.columns.filter((c) => known.has(c.key));
  if (columns.length === 0) return { config: builtInConfig(defs), dropped };
  return {
    config: { ...config, columns, sorts: config.sorts.filter((s) => known.has(s.key)), filters: config.filters.filter((f) => known.has(f.key)), groupBy: config.groupBy && known.has(config.groupBy) ? config.groupBy : null },
    dropped: [...new Set(dropped)],
  };
}

function ts(v: Cell): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

export function passes<T>(row: T, def: ColumnDef<T>, f: FilterConfig, now = Date.now()): boolean {
  const v = def.value(row);
  switch (f.op) {
    case "contains":
      return String(v ?? "").toLowerCase().includes(String(f.value ?? "").toLowerCase().trim());
    case "in": {
      const list = (f.value as string[]) ?? [];
      return list.length === 0 || list.includes(String(v));
    }
    case "is":
      return Boolean(v) === Boolean(f.value);
    case "lastDays": {
      const days = Number(f.value);
      return ts(v) >= now - days * 86_400_000;
    }
    case "range": {
      if (def.type === "DATE") {
        const r = (f.value ?? {}) as { from?: string; to?: string };
        const t = ts(v);
        if (r.from && t < Date.parse(r.from)) return false;
        if (r.to && t > Date.parse(r.to) + 86_399_999) return false;
        return true;
      }
      const r = (f.value ?? {}) as { min?: number | null; max?: number | null };
      const n = Number(v ?? 0);
      if (r.min !== undefined && r.min !== null && n < r.min) return false;
      if (r.max !== undefined && r.max !== null && n > r.max) return false;
      return true;
    }
  }
}

function compareCells(a: Cell, b: Cell, type: FieldType, options?: { value: string }[]): number {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : 1;
  if (b === null || b === undefined) return -1;
  // Status fields sort in the order the statuses happen (Draft first), not alphabetically.
  if (type === "STATUS" && options?.length) return options.findIndex((o) => o.value === String(a)) - options.findIndex((o) => o.value === String(b));
  if (type === "NUMBER") return Number(a) - Number(b);
  if (type === "DATE") return ts(a) - ts(b);
  if (type === "BOOLEAN") return Number(Boolean(a)) - Number(Boolean(b));
  return String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true });
}

export interface Group<T> {
  key: string;
  label: string;
  rows: T[];
}

/** Filter, then sort (up to three levels, stable), then optionally group. Group order follows the sort of the first row of each group. */
export function shape<T>(rows: T[], defs: ColumnDef<T>[], config: ViewConfig, search?: string): { rows: T[]; groups: Group<T>[] | null } {
  const byKey = new Map(defs.map((d) => [d.key, d]));
  let out = rows;
  const q = (search ?? "").trim().toLowerCase();
  if (q) {
    const textDefs = defs.filter((d) => d.type === "TEXT");
    out = out.filter((r) => textDefs.some((d) => String(d.value(r) ?? "").toLowerCase().includes(q)));
  }
  for (const f of config.filters) {
    const def = byKey.get(f.key);
    if (def) out = out.filter((r) => passes(r, def, f));
  }
  const sorts = config.sorts.map((s) => ({ def: byKey.get(s.key), dir: s.dir === "desc" ? -1 : 1 })).filter((s): s is { def: ColumnDef<T>; dir: number } => !!s.def);
  const group = config.groupBy ? byKey.get(config.groupBy) : undefined;
  // Grouped rows are ordered by the group first, then by the sorts inside each group.
  const order = [...(group && !sorts.some((s) => s.def.key === group.key) ? [{ def: group, dir: 1 }] : []), ...sorts];
  if (order.length) {
    out = [...out].sort((a, b) => {
      for (const s of order) {
        const c = compareCells(s.def.value(a), s.def.value(b), s.def.type, s.def.options);
        if (c) return c * s.dir;
      }
      return 0;
    });
  }
  if (!group) return { rows: out, groups: null };
  const map = new Map<string, Group<T>>();
  for (const r of out) {
    const v = group.value(r);
    const k = String(v);
    let g = map.get(k);
    if (!g) {
      g = { key: k, label: group.groupLabel ? group.groupLabel(v) : v === null || v === "" ? "—" : String(v), rows: [] };
      map.set(k, g);
    }
    g.rows.push(r);
  }
  return { rows: out, groups: [...map.values()] };
}

export function sameConfig(a: ViewConfig, b: ViewConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** What a filter says, in short words, for the removable chips. */
export function describeFilter<T>(f: FilterConfig, def: ColumnDef<T> | undefined, t: (s: string, v?: Record<string, string | number>) => string): string {
  const name = t(def?.label ?? f.key);
  switch (f.op) {
    case "contains":
      return `${name}: “${String(f.value)}”`;
    case "in": {
      const list = (f.value as string[]) ?? [];
      const labels = list.map((v) => t(def?.options?.find((o) => o.value === v)?.label ?? v));
      return `${name}: ${labels.join(", ")}`;
    }
    case "is":
      return `${name}: ${f.value ? t("Yes") : t("No")}`;
    case "lastDays":
      return `${name}: ${t("Last {n} days", { n: Number(f.value) })}`;
    case "range": {
      if (def?.type === "DATE") {
        const r = (f.value ?? {}) as { from?: string; to?: string };
        return `${name}: ${r.from ?? "…"} – ${r.to ?? "…"}`;
      }
      const r = (f.value ?? {}) as { min?: number | null; max?: number | null };
      return `${name}: ${r.min ?? "…"} – ${r.max ?? "…"}`;
    }
  }
}
