"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useT } from "@/i18n/client";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { sampleRows } from "@/lib/grid/samples";
import { useGridSpec } from "@/lib/grid/registry";
import { describeFilter, reconcile, sameConfig, type ColumnDef, type Density, type FilterConfig, type GridInfo, type ViewConfig, type ViewTemplate } from "@/lib/grid/engine";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Field";
import { ErrorState, SkeletonRows } from "@/components/ui/states";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { DataGrid } from "@/components/grid/DataGrid";
import { FilterEditor } from "@/components/grid/FilterEditor";

type Tab = "columns" | "sort" | "filters" | "grouping" | "display";
type Width = "desktop" | "tablet" | "phone";
const WIDTHS: Record<Width, string> = { desktop: "100%", tablet: "768px", phone: "420px" };

export default function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const search = useSearchParams();
  const isNew = id === "new";
  const grids = useApi<GridInfo[]>("/views/grids");
  const existing = useApi<ViewTemplate>(isNew ? null : `/admin/view-templates/${id}`);

  if (grids.error || existing.error) return <ErrorState title="We couldn't load this template." onRetry={() => { grids.reload(); existing.reload(); }} />;
  if (grids.loading || (!isNew && existing.loading) || !grids.data) return <SkeletonRows rows={8} />;
  const gridKey = isNew ? (search.get("grid") ?? "") : existing.data!.grid;
  const grid = grids.data.find((g) => g.key === gridKey);
  if (!grid) return <ErrorState title="That grid does not exist." hint={null} />;
  return <Builder key={existing.data?.id ?? "new"} grid={grid} template={isNew ? null : existing.data!} />;
}

function Builder({ grid, template }: { grid: GridInfo; template: ViewTemplate | null }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const spec = useGridSpec(grid.key);
  const defs = spec.defs as ColumnDef<unknown>[];
  const byKey = useMemo(() => new Map(defs.map((d) => [d.key, d])), [defs]);

  // A template saved before a field was removed keeps working; the builder says what it had to drop.
  const start = useMemo(() => (template ? reconcile(template.config, defs) : { config: spec.builtIn as ViewConfig, dropped: [] as string[] }), [template, defs, spec.builtIn]);
  const [name, setName] = useState(template?.name ?? "");
  const [config, setConfig] = useState<ViewConfig>(start.config);
  const [saved, setSaved] = useState<{ name: string; config: ViewConfig }>({ name: template?.name ?? "", config: start.config });
  const [tab, setTab] = useState<Tab>("columns");
  const [width, setWidth] = useState<Width>("desktop");
  const [fieldSearch, setFieldSearch] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const rows = useMemo(() => sampleRows(grid.key), [grid.key]);

  const dirty = name !== saved.name || !sameConfig(config, saved.config);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const edit = (patch: Partial<ViewConfig>) => setConfig((c) => ({ ...c, ...patch }));

  async function save(asCopy: boolean) {
    setNameError(null);
    setFormError(null);
    const finalName = asCopy && name.trim() === saved.name ? `${name.trim()} (copy)` : name.trim();
    if (!finalName) return setNameError(t("Give the template a name."));
    setBusy(true);
    try {
      const body = { grid: grid.key, name: finalName, config };
      const result = template && !asCopy
        ? await api<ViewTemplate>(`/admin/view-templates/${template.id}`, { method: "PUT", body })
        : await api<ViewTemplate>("/admin/view-templates", { method: "POST", body });
      toast(t("Template saved."));
      setSaved({ name: result.name, config });
      setName(result.name);
      if (!template || asCopy) router.replace(`/admin/views/${result.id}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Something went wrong. Try again.";
      if (/name/i.test(msg)) setNameError(t(msg));
      else setFormError(msg);
    } finally {
      setBusy(false);
    }
  }

  const hidden = config.columns.filter((c) => !c.visible && byKey.has(c.key) && t(byKey.get(c.key)!.label).toLowerCase().includes(fieldSearch.toLowerCase()));
  const sortable = defs.filter((d) => !config.sorts.some((s) => s.key === d.key));

  return (
    <>
      <div className="rounded-xl border border-line bg-surface px-6 py-10 text-center md:hidden">
        <div className="font-semibold">{t("Open this on a larger screen to edit templates.")}</div>
      </div>

      <div className="hidden w-full flex-col gap-4 md:flex">
        {/* Top bar */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <button onClick={() => (dirty ? setLeaving(true) : router.push("/admin/views"))} className="min-h-9 self-start text-sm font-medium text-accent-deep">← {t("Views")}</button>
            <div className="flex flex-wrap items-center gap-3">
              <Input value={name} onChange={(e) => { setName(e.target.value); setNameError(null); }} invalid={!!nameError} placeholder={t("Template name")} aria-label={t("Template name")} className="w-[320px] text-lg font-semibold" maxLength={80} />
              <span className="rounded-full bg-surface-2 px-3 py-1 text-sm">{t(grid.label)}</span>
              {dirty && <span className="inline-flex items-center gap-1.5 text-sm text-amber"><span className="h-2 w-2 rounded-full bg-amber" />{t("Unsaved changes")}</span>}
            </div>
            {nameError && <span role="alert" className="text-[13px] text-red">{nameError}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" disabled={!dirty} onClick={() => { setName(saved.name); setConfig(saved.config); setNameError(null); }}>{t("Discard")}</Button>
            {template && <Button onClick={() => save(true)} disabled={busy}>{t("Save as copy")}</Button>}
            <Button variant="primary" onClick={() => save(false)} loading={busy} disabled={!dirty && !!template}>{t("Save")}</Button>
          </div>
        </div>
        {formError && <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">{t(formError)}</div>}
        {start.dropped.length > 0 && (
          <div role="status" className="rounded-lg border border-amber-line bg-amber-soft px-3 py-2.5 text-sm text-amber">
            {t("This template used fields that no longer exist: {fields}. They were removed from the layout. Save to keep the change.", { fields: start.dropped.join(", ") })}
          </div>
        )}
        <p className="m-0 text-sm text-muted">{t("A template only changes the layout. Everyone still sees only their own records.")}</p>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Live preview */}
          <section className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-[15px] font-semibold">{t("Preview")} <span className="font-normal text-muted">· {t("sample data")}</span></h2>
              <div role="group" aria-label={t("Preview width")} className="inline-flex overflow-hidden rounded-lg border border-line bg-surface">
                {(["desktop", "tablet", "phone"] as Width[]).map((w, i) => (
                  <button key={w} onClick={() => setWidth(w)} aria-pressed={width === w} className={`h-9 px-3 text-sm ${i ? "border-s border-line" : ""} ${width === w ? "bg-accent-soft font-semibold text-accent-deep" : "text-muted"}`}>{t(w === "desktop" ? "Desktop" : w === "tablet" ? "Tablet" : "Phone")}</button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <div style={{ width: WIDTHS[width], maxWidth: "100%" }}>
                <DataGrid
                  defs={defs}
                  rows={rows}
                  rowKey={spec.rowKey}
                  views={undefined}
                  fixedConfig={config}
                  onConfigChange={setConfig}
                  emptyTitle="Nothing to preview."
                />
              </div>
            </div>
          </section>

          <div className="flex min-w-0 flex-col gap-4">
          {/* Available fields */}
          <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
            <h2 className="m-0 text-[15px] font-semibold">{t("Available fields")}</h2>
            <Input value={fieldSearch} onChange={(e) => setFieldSearch(e.target.value)} placeholder={t("Search fields")} aria-label={t("Search fields")} />
            {hidden.length === 0 && <div className="text-sm text-muted">{t("Every field is already in the layout.")}</div>}
            {hidden.map((c) => (
              <button key={c.key} onClick={() => edit({ columns: config.columns.map((x) => (x.key === c.key ? { ...x, visible: true } : x)) })} className="flex min-h-10 items-center justify-between rounded-lg border border-line px-3 text-start hover:bg-bg">
                {t(byKey.get(c.key)!.label)}<span className="text-accent-deep">+ {t("Add")}</span>
              </button>
            ))}
          </section>

          {/* Settings */}
          <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
            <Tabs<Tab> tabs={[{ key: "columns", label: "Columns" }, { key: "sort", label: "Sort" }, { key: "filters", label: "Filters" }, { key: "grouping", label: "Grouping" }, { key: "display", label: "Display" }]} active={tab} onChange={setTab} />

            {tab === "columns" && (
              <div className="flex flex-col">
                {config.columns.filter((c) => byKey.has(c.key)).map((c, i, arr) => (
                  <div key={c.key} className="flex min-h-11 items-center gap-1 border-b border-line last:border-b-0">
                    <label className="flex flex-1 cursor-pointer items-center gap-2.5">
                      <input type="checkbox" checked={c.visible} disabled={c.visible && arr.filter((x) => x.visible).length === 1} onChange={(e) => edit({ columns: config.columns.map((x) => (x.key === c.key ? { ...x, visible: e.target.checked } : x)) })} className="h-4 w-4 accent-[#1D6FE8]" />
                      {t(byKey.get(c.key)!.label)}
                    </label>
                    <label className="flex items-center gap-1 text-xs text-muted"><input type="checkbox" checked={c.pinned} onChange={(e) => edit({ columns: config.columns.map((x) => (x.key === c.key ? { ...x, pinned: e.target.checked } : x)) })} className="h-3.5 w-3.5 accent-[#1D6FE8]" />{t("Pin")}</label>
                    <button aria-label={t("Move up")} disabled={i === 0} onClick={() => edit({ columns: swap(config.columns, i, i - 1) })} className="h-8 w-8 rounded text-muted enabled:hover:bg-surface-2 disabled:opacity-30">↑</button>
                    <button aria-label={t("Move down")} disabled={i === arr.length - 1} onClick={() => edit({ columns: swap(config.columns, i, i + 1) })} className="h-8 w-8 rounded text-muted enabled:hover:bg-surface-2 disabled:opacity-30">↓</button>
                  </div>
                ))}
              </div>
            )}

            {tab === "sort" && (
              <div className="flex flex-col gap-2">
                <p className="m-0 text-sm text-muted">{t("Up to 3 levels. The first one sorts first.")}</p>
                {config.sorts.map((s, i) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-accent text-xs text-white">{i + 1}</span>
                    <span className="flex-1 font-medium">{t(byKey.get(s.key)?.label ?? s.key)}</span>
                    <select value={s.dir} onChange={(e) => edit({ sorts: config.sorts.map((x, j) => (j === i ? { ...x, dir: e.target.value as "asc" | "desc" } : x)) })} aria-label={t("Direction")} className="h-9 rounded-lg border border-line bg-surface px-2 text-sm">
                      <option value="asc">{t("Ascending")}</option>
                      <option value="desc">{t("Descending")}</option>
                    </select>
                    <button aria-label={t("Remove sort")} onClick={() => edit({ sorts: config.sorts.filter((_, j) => j !== i) })} className="h-9 w-9 rounded text-muted hover:bg-surface-2">×</button>
                  </div>
                ))}
                {config.sorts.length < 3 && (
                  <select value="" onChange={(e) => e.target.value && edit({ sorts: [...config.sorts, { key: e.target.value, dir: "asc" }] })} aria-label={t("Add a sort")} className="h-11 rounded-lg border border-line bg-surface px-3 text-[15px]">
                    <option value="">+ {t("Add a sort")}</option>
                    {sortable.map((d) => <option key={d.key} value={d.key}>{t(d.label)}</option>)}
                  </select>
                )}
              </div>
            )}

            {tab === "filters" && (
              <div className="flex flex-col gap-2">
                <p className="m-0 text-sm text-muted">{t("Default filters. People can still change them for themselves.")}</p>
                {config.filters.map((f, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm font-medium text-accent-deep">
                    <span className="break-words">{describeFilter(f as FilterConfig, byKey.get(f.key), t)}</span>
                    <button aria-label={t("Remove filter")} onClick={() => edit({ filters: config.filters.filter((_, j) => j !== i) })} className="h-8 w-8 flex-none rounded hover:bg-white/60">×</button>
                  </div>
                ))}
                {adding && byKey.get(adding) ? (
                  <div className="rounded-lg border border-line p-2">
                    <FilterEditor def={byKey.get(adding)!} onCancel={() => setAdding(null)} onApply={(f) => { edit({ filters: [...config.filters.filter((x) => x.key !== f.key), f] }); setAdding(null); }} />
                  </div>
                ) : (
                  <select value="" onChange={(e) => setAdding(e.target.value || null)} aria-label={t("Add filter")} className="h-11 rounded-lg border border-line bg-surface px-3 text-[15px]">
                    <option value="">+ {t("Add filter")}</option>
                    {defs.map((d) => <option key={d.key} value={d.key}>{t(d.label)}</option>)}
                  </select>
                )}
              </div>
            )}

            {tab === "grouping" && (
              <div className="flex flex-col gap-1">
                <p className="m-0 text-sm text-muted">{t("Group rows by one field. Group headers show how many rows are in each group.")}</p>
                <label className="flex min-h-10 cursor-pointer items-center gap-2.5"><input type="radio" name="group" checked={!config.groupBy} onChange={() => edit({ groupBy: null })} className="h-4 w-4 accent-[#1D6FE8]" />{t("No grouping")}</label>
                {defs.filter((d) => d.groupable).map((d) => (
                  <label key={d.key} className="flex min-h-10 cursor-pointer items-center gap-2.5"><input type="radio" name="group" checked={config.groupBy === d.key} onChange={() => edit({ groupBy: d.key })} className="h-4 w-4 accent-[#1D6FE8]" />{t(d.label)}</label>
                ))}
              </div>
            )}

            {tab === "display" && (
              <div className="flex flex-col gap-3">
                <div role="radiogroup" aria-label={t("Row density")} className="flex flex-col gap-1">
                  <div className="text-sm font-medium">{t("Row density")}</div>
                  {(["comfortable", "compact"] as Density[]).map((d) => (
                    <label key={d} className="flex min-h-10 cursor-pointer items-center gap-2.5"><input type="radio" name="density" checked={config.density === d} onChange={() => edit({ density: d })} className="h-4 w-4 accent-[#1D6FE8]" />{t(d === "comfortable" ? "Comfortable" : "Compact")}</label>
                  ))}
                </div>
                <label className="flex flex-col gap-1.5 text-sm font-medium">{t("Rows per page")}
                  <select value={config.pageSize} onChange={(e) => edit({ pageSize: Number(e.target.value) })} className="h-11 rounded-lg border border-line bg-surface px-3 text-[15px] font-normal">
                    {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              </div>
            )}
          </section>
          </div>
        </div>
      </div>

      {leaving && (
        <Dialog title={t("Leave without saving?")} onClose={() => setLeaving(false)}>
          <p className="m-0 text-muted">{t("You have changes that are not saved.")}</p>
          <DialogActions>
            <Button variant="ghost" onClick={() => setLeaving(false)}>{t("Keep editing")}</Button>
            <Button variant="danger" onClick={() => router.push("/admin/views")}>{t("Leave")}</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}

function swap<T>(list: T[], a: number, b: number): T[] {
  const out = [...list];
  [out[a], out[b]] = [out[b], out[a]];
  return out;
}
