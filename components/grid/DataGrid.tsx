"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { useT } from "@/i18n/client";
import { Popover, MenuItem } from "@/components/ui/Popover";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";
import { FilterEditor } from "@/components/grid/FilterEditor";
import {
  builtInConfig, describeFilter, reconcile, sameConfig, shape,
  type AvailableViews, type ColumnDef, type Density, type FilterConfig, type ViewConfig,
} from "@/lib/grid/engine";

const BASE_PX = 150;
const PAGE_SIZES = [10, 20, 50, 100];

const I = {
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  up: <path d="M12 19V5M5 12l7-7 7 7" />,
  down: <path d="M12 5v14M19 12l-7 7-7-7" />,
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  more: <path d="M12 5h.01M12 12h.01M12 19h.01" />,
};
function Icon({ d, size = 16, fill }: { d: ReactNode; size?: number; fill?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`flex-none ${d === I.chevronRight ? "rtl:-scale-x-100" : ""}`}>
      {d}
    </svg>
  );
}

export interface DataGridProps<T> {
  defs: ColumnDef<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  /** Where a row leads. Rows are clickable and keyboard-focusable. */
  rowHref?: (row: T) => string;
  rowBg?: (row: T) => string | undefined;
  /** Templates available to this person (null = not loaded yet or none). */
  views: AvailableViews | undefined;
  /** The built-in Default view (never edited or deleted). */
  builtIn?: ViewConfig;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  emptyTitle: string;
  emptyText?: string;
  /** Controlled mode for the builder preview: shows this config, hides the view selector. */
  fixedConfig?: ViewConfig;
  /** With fixedConfig: called when the layout is changed by dragging columns (the builder preview). */
  onConfigChange?: (config: ViewConfig) => void;
  /** Extra controls on the right of the toolbar (e.g. a New button). */
  toolbarExtra?: ReactNode;
  searchPlaceholder?: string;
  /** Show each row as a card instead of a table row (My aligners keeps its card design). */
  renderCard?: (row: T) => ReactNode;
}

export function DataGrid<T>(props: DataGridProps<T>) {
  const { defs, rows, rowKey, rowHref, rowBg, views, loading, error, onRetry, emptyTitle, emptyText, fixedConfig, toolbarExtra } = props;
  const t = useT();
  const router = useRouter();
  const builtIn = useMemo(() => props.builtIn ?? builtInConfig(defs), [props.builtIn, defs]);

  // Which view is selected: the person's default if they have one, else the built-in view.
  const defaultId = views?.defaultId ?? null;
  const [viewId, setViewId] = useState<string | "builtin" | null>(null);
  const activeId = viewId ?? defaultId ?? "builtin";
  const template = views?.templates.find((x) => x.id === activeId);
  const base = useMemo(() => {
    if (fixedConfig) return fixedConfig;
    const cfg = template ? reconcile(template.config, defs).config : builtIn;
    return cfg;
  }, [fixedConfig, template, defs, builtIn]);

  // Changes made in this session (filters, sort, columns): they last until the person resets or picks another view.
  const [local, setLocal] = useState<ViewConfig | null>(null);
  const config = fixedConfig ?? local ?? base;
  const changed = !fixedConfig && local !== null && !sameConfig(local, base);
  const edit = (patch: Partial<ViewConfig>) => setLocal({ ...config, ...patch });

  const [search, setSearch] = useState("");
  // The page goes back to the first one whenever what is shown changes.
  const resetKey = JSON.stringify([config.filters, config.sorts, config.groupBy, search, config.pageSize, activeId]);
  const [pageAt, setPageAt] = useState<{ key: string; page: number }>({ key: resetKey, page: 0 });
  const page = pageAt.key === resetKey ? pageAt.page : 0;
  const setPage = (p: number) => setPageAt({ key: resetKey, page: p });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);

  const pageSize = config.pageSize;

  const byKey = useMemo(() => new Map(defs.map((d) => [d.key, d])), [defs]);
  const visible = config.columns.filter((c) => c.visible && byKey.has(c.key)).map((c) => ({ ...c, def: byKey.get(c.key)! }));
  const shaped = useMemo(() => shape(rows ?? [], defs, config, search), [rows, defs, config, search]);

  // Group headers show the whole group's count; collapsed groups show only their header. Paging counts what is on screen.
  type Item = { kind: "group"; key: string; label: string; count: number } | { kind: "row"; row: T };
  const items: Item[] = useMemo(() => {
    if (!shaped.groups) return shaped.rows.map((row) => ({ kind: "row", row }) as Item);
    const out: Item[] = [];
    for (const g of shaped.groups) {
      out.push({ kind: "group", key: g.key, label: g.label, count: g.rows.length });
      if (!collapsed.has(g.key)) g.rows.forEach((row) => out.push({ kind: "row", row }));
    }
    return out;
  }, [shaped, collapsed]);
  const totalRows = shaped.rows.length;
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = items.slice(safePage * pageSize, safePage * pageSize + pageSize);

  // Column geometry: pinned columns stay in view while the rest scrolls sideways.
  // A column the person dragged to a width keeps exactly that width; the others share what is left.
  const widths = visible.map((c) => c.width ?? Math.round(BASE_PX * (c.def.width ?? 1)));
  const template_ = visible.map((c, i) => (c.width ? `${widths[i]}px` : `minmax(${widths[i]}px, ${c_fr(widths[i])}fr)`)).join(" ") + " 32px";
  const pinLeft: number[] = [];
  let acc = 0;
  visible.forEach((c, i) => {
    pinLeft[i] = acc;
    if (c.pinned) acc += widths[i];
  });
  const minWidth = widths.reduce((a, b) => a + b, 0) + 32 + 40;

  // Dragging column edges to resize and column headers to reorder (the buttons in the Columns menu do the same without a mouse).
  const canDrag = !fixedConfig || !!props.onConfigChange;
  const setColumns = (fn: (cols: ViewConfig["columns"]) => ViewConfig["columns"]) => {
    if (fixedConfig) props.onConfigChange?.({ ...fixedConfig, columns: fn(fixedConfig.columns) });
    else setLocal((prev) => { const cur = prev ?? base; return { ...cur, columns: fn(cur.columns) }; });
  };
  const [dragKey, setDragKey] = useState<string | null>(null);
  const startResize = (e: React.PointerEvent<HTMLElement>, key: string, startWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const x0 = e.clientX;
    const move = (ev: PointerEvent) => {
      const w = Math.max(80, Math.min(600, Math.round(startWidth + (rtl ? x0 - ev.clientX : ev.clientX - x0))));
      setColumns((cols) => cols.map((c) => (c.key === key ? { ...c, width: w } : c)));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const dropOn = (target: string) => {
    if (!dragKey || dragKey === target) return setDragKey(null);
    setColumns((cols) => {
      const from = cols.findIndex((c) => c.key === dragKey);
      const to = cols.findIndex((c) => c.key === target);
      if (from < 0 || to < 0) return cols;
      const out = [...cols];
      const [moved] = out.splice(from, 1);
      out.splice(to, 0, moved);
      return out;
    });
    setDragKey(null);
  };

  const rowPad = config.density === "compact" ? "py-1.5" : "py-3.5";

  const sortRank = (key: string) => config.sorts.findIndex((s) => s.key === key);
  const setSort = (key: string, dir: "asc" | "desc" | null, add = false) => {
    const rest = add ? config.sorts.filter((s) => s.key !== key) : [];
    if (dir === null) return edit({ sorts: config.sorts.filter((s) => s.key !== key) });
    if (add && rest.length >= 3) return;
    edit({ sorts: [...rest, { key, dir }] });
  };
  const clickHeader = (key: string, shift: boolean) => {
    const cur = config.sorts.find((s) => s.key === key);
    const next = !cur ? "asc" : cur.dir === "asc" ? "desc" : null;
    if (shift && cur === undefined) return setSort(key, "asc", true);
    if (shift) return edit({ sorts: config.sorts.map((s) => (s.key === key ? { ...s, dir: s.dir === "asc" ? "desc" : "asc" } : s)) });
    if (!next) return setSort(key, null);
    setSort(key, next);
  };

  const filterable = defs;
  const setFilter = (f: FilterConfig, index: number | null) => {
    const list = config.filters.filter((x, i) => (index === null ? x.key !== f.key : i !== index));
    edit({ filters: index === null ? [...list, f] : [...list.slice(0, index), f, ...list.slice(index)] });
  };

  const hasFilters = config.filters.length > 0 || search.trim() !== "";
  const showView = !fixedConfig;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* Toolbar (hidden in the builder preview, which only shows the layout) */}
      {!fixedConfig && <div className="flex flex-wrap items-center gap-2">
        {showView && (
          <Popover
            label={t("Choose a view")}
            width={300}
            triggerClassName="relative inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-surface px-3.5 text-[15px] font-medium hover:bg-bg"
            trigger={
              <>
                <span className="text-muted">{t("View:")}</span>
                <span>{template ? template.name : t("Default view")}</span>
                {changed && <span className="h-2 w-2 rounded-full bg-[#C98A00]" role="img" aria-label={t("Changed")} title={t("Changed")} />}
                <Icon d={I.chevronDown} />
              </>
            }
          >
            {(close) => (
              <div className="flex flex-col">
                <MenuItem active={activeId === "builtin"} onClick={() => { setViewId("builtin"); setLocal(null); close(); }}>
                  <span className="flex-1">{t("Default view")}</span>
                  {defaultId === null && <Icon d={I.star} size={14} fill />}
                </MenuItem>
                {(views?.templates ?? []).map((v) => (
                  <MenuItem key={v.id} active={activeId === v.id} onClick={() => { setViewId(v.id); setLocal(null); close(); }}>
                    <span className="flex-1 truncate">{v.name}</span>
                    {defaultId === v.id && <Icon d={I.star} size={14} fill />}
                  </MenuItem>
                ))}
                <div className="mt-1 border-t border-line pt-1">
                  <MenuItem onClick={() => { setViewId(null); setLocal(null); close(); }}>{t("Reset to my default")}</MenuItem>
                </div>
              </div>
            )}
          </Popover>
        )}
        {showView && changed && (
          <button onClick={() => { setViewId(null); setLocal(null); }} className="min-h-11 px-1 text-sm font-medium text-accent-deep">
            {t("Reset to my default")}
          </button>
        )}

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(props.searchPlaceholder ?? "Search")}
          aria-label={t("Search")}
          className="h-11 min-w-[180px] flex-1 rounded-lg border border-line bg-surface px-3 text-[15px] md:max-w-xs"
        />

        <Popover
          label={t("Add filter")}
          width={adding ? 280 : 240}
          triggerClassName="inline-flex h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-[15px] font-medium hover:bg-bg"
          trigger={<>+ {t("Add filter")}</>}
        >
          {(close) =>
            adding && byKey.get(adding) ? (
              <FilterEditor
                key={adding}
                def={byKey.get(adding)!}
                initial={config.filters.find((f) => f.key === adding)}
                onCancel={() => setAdding(null)}
                onApply={(f) => { setFilter(f, null); setAdding(null); close(); }}
              />
            ) : (
              <div className="flex max-h-72 flex-col overflow-y-auto">
                <div className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-[.6px] text-muted">{t("Filter by")}</div>
                {filterable.map((d) => (
                  <MenuItem key={d.key} onClick={() => setAdding(d.key)}>{t(d.label)}</MenuItem>
                ))}
              </div>
            )
          }
        </Popover>

        <Popover
          label={t("Columns")}
          width={280}
          triggerClassName="inline-flex h-11 items-center rounded-lg border border-line bg-surface px-3.5 text-[15px] font-medium hover:bg-bg"
          trigger={<>{t("Columns")}</>}
        >
          <div className="flex max-h-80 flex-col overflow-y-auto">
            {config.columns.filter((c) => byKey.has(c.key)).map((c, i, arr) => (
              <div key={c.key} className="flex min-h-10 items-center gap-1 rounded-lg px-2 hover:bg-bg">
                <label className="flex flex-1 cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={c.visible}
                    disabled={c.visible && arr.filter((x) => x.visible).length === 1}
                    onChange={(e) => edit({ columns: config.columns.map((x) => (x.key === c.key ? { ...x, visible: e.target.checked } : x)) })}
                    className="h-4 w-4 accent-[#1D6FE8]"
                  />
                  {t(byKey.get(c.key)!.label)}
                </label>
                <button aria-label={t("Move up")} disabled={i === 0} onClick={() => edit({ columns: move(config.columns, c.key, -1) })} className="flex h-8 w-8 items-center justify-center rounded text-muted enabled:hover:bg-surface-2 disabled:opacity-30"><Icon d={I.up} size={14} /></button>
                <button aria-label={t("Move down")} disabled={i === arr.length - 1} onClick={() => edit({ columns: move(config.columns, c.key, 1) })} className="flex h-8 w-8 items-center justify-center rounded text-muted enabled:hover:bg-surface-2 disabled:opacity-30"><Icon d={I.down} size={14} /></button>
              </div>
            ))}
            <div className="mt-1 border-t border-line pt-1">
              <MenuItem onClick={() => edit({ columns: base.columns })}>{t("Reset")}</MenuItem>
            </div>
          </div>
        </Popover>

        <Popover
          label={t("Group by")}
          width={240}
          triggerClassName={`inline-flex h-11 items-center gap-1.5 rounded-lg border px-3.5 text-[15px] font-medium hover:bg-bg ${config.groupBy ? "border-accent bg-accent-soft text-accent-deep" : "border-line bg-surface"}`}
          trigger={<>{t("Group by")}{config.groupBy ? `: ${t(byKey.get(config.groupBy)?.label ?? "")}` : ""}</>}
        >
          {(close) => (
            <div className="flex flex-col">
              <MenuItem active={!config.groupBy} onClick={() => { edit({ groupBy: null }); close(); }}>{t("No grouping")}</MenuItem>
              {defs.filter((d) => d.groupable).map((d) => (
                <MenuItem key={d.key} active={config.groupBy === d.key} onClick={() => { edit({ groupBy: d.key }); setCollapsed(new Set()); close(); }}>{t(d.label)}</MenuItem>
              ))}
            </div>
          )}
        </Popover>

        <div role="group" aria-label={t("Row density")} className="inline-flex overflow-hidden rounded-lg border border-line bg-surface">
          {(["comfortable", "compact"] as Density[]).map((d, i) => (
            <button key={d} onClick={() => edit({ density: d })} aria-pressed={config.density === d} className={`h-11 px-3 text-sm ${i ? "border-s border-line" : ""} ${config.density === d ? "bg-accent-soft font-semibold text-accent-deep" : "text-muted"}`}>
              {t(d === "comfortable" ? "Comfortable" : "Compact")}
            </button>
          ))}
        </div>
        {toolbarExtra}
      </div>}

      {config.filters.length > 0 && !fixedConfig && (
        <div className="flex flex-wrap items-center gap-2" aria-label={t("Active filters")}>
          {config.filters.map((f, i) => (
            <span key={`${f.key}-${i}`} className="inline-flex h-9 items-center gap-1 rounded-full border border-accent bg-accent-soft ps-3 pe-1 text-sm font-medium text-accent-deep">
              <Popover
                label={t("Edit filter")}
                width={280}
                triggerClassName="max-w-[260px] truncate"
                trigger={<>{describeFilter(f, byKey.get(f.key), t)}</>}
              >
                {(close) => byKey.get(f.key) ? (
                  <FilterEditor def={byKey.get(f.key)!} initial={f} onCancel={close} onApply={(nf) => { setFilter(nf, i); close(); }} />
                ) : null}
              </Popover>
              <button aria-label={t("Remove filter")} onClick={() => edit({ filters: config.filters.filter((_, j) => j !== i) })} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/60"><Icon d={I.x} size={14} /></button>
            </span>
          ))}
          <button onClick={() => edit({ filters: [] })} className="min-h-9 px-1 text-sm font-medium text-muted hover:text-ink">{t("Clear filters")}</button>
        </div>
      )}

      {error ? (
        <ErrorState title={t("We couldn't load this list.")} onRetry={onRetry} />
      ) : loading || !rows ? (
        <SkeletonRows rows={8} />
      ) : rows.length === 0 ? (
        <EmptyState title={emptyTitle} text={emptyText} />
      ) : totalRows === 0 ? (
        <EmptyState title="Nothing matches these filters." text="Try removing a filter or changing your search.">
          {hasFilters && <Button onClick={() => { edit({ filters: [] }); setSearch(""); }}>{t("Clear filters")}</Button>}
        </EmptyState>
      ) : (
        <>
          {props.renderCard && (
            <div className="flex flex-col gap-3.5">
              {slice.map((it, idx) =>
                it.kind === "group" ? (
                  <button key={`g-${it.key}`} onClick={() => setCollapsed((s) => { const n = new Set(s); if (n.has(it.key)) n.delete(it.key); else n.add(it.key); return n; })} aria-expanded={!collapsed.has(it.key)}
                    className="flex min-h-11 items-center gap-2 rounded-lg bg-surface-2 px-3 text-start font-semibold">
                    <Icon d={collapsed.has(it.key) ? I.chevronRight : I.chevronDown} size={16} />{t(it.label)}<span className="text-sm text-muted">{it.count}</span>
                  </button>
                ) : (
                  <div key={rowKey(it.row) + idx}>{props.renderCard!(it.row)}</div>
                ),
              )}
            </div>
          )}
          {/* Table (tablet and desktop) */}
          {!props.renderCard && <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface md:block">
            <div style={{ minWidth }}>
              <div role="row" className="grid items-center gap-4 border-b border-line bg-bg px-5 text-xs font-semibold uppercase tracking-[.6px] text-muted" style={{ gridTemplateColumns: template_ }}>
                {visible.map((c, i) => {
                  const rank = sortRank(c.key);
                  const dir = rank >= 0 ? config.sorts[rank].dir : null;
                  return (
                    <div key={c.key} role="columnheader" aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
                      draggable={canDrag} onDragStart={(e) => { setDragKey(c.key); e.dataTransfer.setData("text/plain", c.key); e.dataTransfer.effectAllowed = "move"; }}
                      onDragOver={canDrag ? (e) => e.preventDefault() : undefined} onDrop={canDrag ? () => dropOn(c.key) : undefined} onDragEnd={() => setDragKey(null)}
                      className={`relative flex min-h-11 items-center gap-1 ${c.pinned ? "sticky z-10 bg-bg" : ""} ${dragKey === c.key ? "opacity-40" : ""}`} style={c.pinned ? { insetInlineStart: pinLeft[i] } : undefined}>
                      <button onClick={(e) => clickHeader(c.key, e.shiftKey)} className="flex min-h-11 min-w-0 items-center gap-1 text-start uppercase tracking-[.6px]" title={t("Click to sort. Shift-click adds a second sort.")}>
                        <span className="truncate">{t(c.def.label)}</span>
                        {dir && <Icon d={dir === "asc" ? I.up : I.down} size={12} />}
                        {rank >= 0 && config.sorts.length > 1 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] text-white">{rank + 1}</span>}
                      </button>
                      {!fixedConfig && <Popover
                        label={t("Column options")}
                        width={230}
                        triggerClassName="flex h-8 w-8 items-center justify-center rounded text-muted hover:bg-surface-2"
                        trigger={<Icon d={I.more} size={16} />}
                      >
                        {(close) => (
                          <div className="flex flex-col text-ink normal-case tracking-normal">
                            <MenuItem onClick={() => { setSort(c.key, "asc"); close(); }}>{t("Sort ascending")}</MenuItem>
                            <MenuItem onClick={() => { setSort(c.key, "desc"); close(); }}>{t("Sort descending")}</MenuItem>
                            <MenuItem disabled={config.sorts.length >= 3 && rank < 0} onClick={() => { setSort(c.key, dir ?? "asc", true); close(); }}>{t("Add as next sort")}</MenuItem>
                            {rank >= 0 && <MenuItem onClick={() => { setSort(c.key, null); close(); }}>{t("Remove sort")}</MenuItem>}
                            {c.def.groupable && <MenuItem onClick={() => { edit({ groupBy: c.key }); setCollapsed(new Set()); close(); }}>{t("Group by this column")}</MenuItem>}
                            <MenuItem onClick={() => { edit({ columns: config.columns.map((x) => (x.key === c.key ? { ...x, pinned: !x.pinned } : x)) }); close(); }}>{t(c.pinned ? "Unpin" : "Pin left")}</MenuItem>
                            <MenuItem disabled={visible.length === 1} onClick={() => { edit({ columns: config.columns.map((x) => (x.key === c.key ? { ...x, visible: false } : x)) }); close(); }}>{t("Hide column")}</MenuItem>
                          </div>
                        )}
                      </Popover>}
                      {canDrag && (
                        <span role="separator" aria-orientation="vertical" aria-label={t("Resize column")} title={t("Drag to resize")}
                          onPointerDown={(e) => startResize(e, c.key, widths[i])} draggable={false} onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDoubleClick={() => setColumns((cols) => cols.map((x) => (x.key === c.key ? { ...x, width: undefined } : x)))}
                          className="absolute inset-y-1 -end-2.5 w-2.5 cursor-col-resize touch-none rounded hover:bg-accent/40" />
                      )}
                    </div>
                  );
                })}
                <span />
              </div>
              {slice.map((it, idx) =>
                it.kind === "group" ? (
                  <button key={`g-${it.key}`} onClick={() => setCollapsed((s) => { const n = new Set(s); if (n.has(it.key)) n.delete(it.key); else n.add(it.key); return n; })}
                    aria-expanded={!collapsed.has(it.key)} className="flex min-h-11 w-full items-center gap-2 border-b border-line bg-surface-2/60 px-5 text-start text-sm font-semibold">
                    <Icon d={collapsed.has(it.key) ? I.chevronRight : I.chevronDown} size={16} />
                    {t(it.label)}
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">{it.count}</span>
                  </button>
                ) : (
                  <div key={rowKey(it.row) + idx} role="row" tabIndex={rowHref ? 0 : undefined}
                    onClick={rowHref ? () => router.push(rowHref(it.row)) : undefined}
                    onKeyDown={rowHref ? (e) => e.key === "Enter" && router.push(rowHref(it.row)) : undefined}
                    className={`group grid items-center gap-4 border-b border-line px-5 text-sm ${rowPad} ${rowHref ? "cursor-pointer hover:bg-bg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent" : ""}`}
                    style={{ gridTemplateColumns: template_, background: rowBg?.(it.row) }}>
                    {visible.map((c, i) => (
                      <div key={c.key} role="cell" className={`min-w-0 ${c.pinned ? "sticky z-10 bg-inherit" : ""}`} style={c.pinned ? { insetInlineStart: pinLeft[i], background: rowBg?.(it.row) ?? "var(--surface)" } : undefined}>
                        {c.def.render(it.row)}
                      </div>
                    ))}
                    <span className="text-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">{rowHref && <Icon d={I.chevronRight} size={16} />}</span>
                  </div>
                ),
              )}
            </div>
          </div>}

          {/* Cards (phone) */}
          {!props.renderCard && <div className="flex flex-col gap-3 md:hidden">
            {slice.map((it, idx) =>
              it.kind === "group" ? (
                <button key={`g-${it.key}`} onClick={() => setCollapsed((s) => { const n = new Set(s); if (n.has(it.key)) n.delete(it.key); else n.add(it.key); return n; })} aria-expanded={!collapsed.has(it.key)}
                  className="flex min-h-11 items-center gap-2 rounded-lg bg-surface-2 px-3 text-start font-semibold">
                  <Icon d={collapsed.has(it.key) ? I.chevronRight : I.chevronDown} size={16} />{t(it.label)}<span className="text-sm text-muted">{it.count}</span>
                </button>
              ) : (
                <MobileCard key={rowKey(it.row) + idx} row={it.row} cols={visible.map((c) => c.def)} href={rowHref?.(it.row)} bg={rowBg?.(it.row)} />
              ),
            )}
          </div>}

          {/* Footer: count, rows per page, pages */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <span>{t("Showing {from} to {to} of {total}", { from: Math.min(safePage * pageSize + 1, items.length), to: Math.min(safePage * pageSize + pageSize, items.length), total: items.length })}{shaped.groups ? ` · ${t("{n} rows", { n: totalRows })}` : ""}</span>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                {t("Rows per page")}
                <select value={pageSize} onChange={(e) => edit({ pageSize: Number(e.target.value) })} className="h-9 rounded-lg border border-line bg-surface px-2 text-ink">
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <nav aria-label={t("Pages")} className="flex items-center gap-1">
                <button disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className="h-9 rounded-lg border border-line bg-surface px-3 enabled:text-ink disabled:cursor-not-allowed">{t("Previous")}</button>
                {pageButtons(pages, safePage).map((p, i) => p === "…" ? <span key={`e${i}`} className="px-1">…</span> : (
                  <button key={p} onClick={() => setPage(p as number)} aria-current={p === safePage ? "page" : undefined} className={`h-9 min-w-9 rounded-lg border px-2 ${p === safePage ? "border-accent bg-accent-soft font-semibold text-accent-deep" : "border-line bg-surface text-ink"}`}>{(p as number) + 1}</button>
                ))}
                <button disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)} className="h-9 rounded-lg border border-line bg-surface px-3 enabled:text-ink disabled:cursor-not-allowed">{t("Next")}</button>
              </nav>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function c_fr(w: number) {
  return (w / BASE_PX).toFixed(2);
}

function move<K extends { key: string }>(list: K[], key: string, by: number): K[] {
  const i = list.findIndex((x) => x.key === key);
  const j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

function pageButtons(pages: number, current: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i);
  const out: (number | "…")[] = [0];
  const from = Math.max(1, current - 1);
  const to = Math.min(pages - 2, current + 1);
  if (from > 1) out.push("…");
  for (let i = from; i <= to; i++) out.push(i);
  if (to < pages - 2) out.push("…");
  out.push(pages - 1);
  return out;
}

function MobileCard<T>({ row, cols, href, bg }: { row: T; cols: ColumnDef<T>[]; href?: string; bg?: string }) {
  const t = useT();
  const router = useRouter();
  const [more, setMore] = useState(false);
  const shown = more ? cols : cols.slice(0, 3);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4" style={{ background: bg }}>
      <div onClick={href ? () => router.push(href) : undefined} className={`flex flex-col gap-2 ${href ? "cursor-pointer" : ""}`}>
        {shown.map((c, i) => (
          <div key={c.key} className={i === 0 ? "text-[17px] font-semibold" : "flex items-center justify-between gap-3 text-sm"}>
            {i > 0 && <span className="text-muted">{t(c.label)}</span>}
            <span className="min-w-0 text-end">{c.render(row)}</span>
          </div>
        ))}
      </div>
      {cols.length > 3 && <button onClick={() => setMore((m) => !m)} aria-expanded={more} className="min-h-11 self-start text-sm font-medium text-accent-deep">{t(more ? "Less" : "More")}</button>}
    </div>
  );
}
