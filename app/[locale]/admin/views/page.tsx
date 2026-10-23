"use client";

import { useState } from "react";
import Link, { useRouter } from "@/i18n/navigation";
import { useLocalizedFormats } from "@/i18n/formats";
import { useT } from "@/i18n/client";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { useDebounced } from "@/lib/useDebounced";
import type { Role } from "@/lib/types";
import type { GridInfo, ViewTemplate } from "@/lib/grid/engine";
import { Icon } from "@/components/shell/Icon";
import { Button, LinkButton } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";
import { Popover } from "@/components/ui/Popover";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { ShareDialog } from "@/components/views/ShareDialog";

const PLURAL: Record<Role, string> = { ADMIN: "Admins", CLINIC: "Clinics", DOCTOR: "Doctors", CUSTOMER: "Patients" };
const PORTAL: Record<Role, string> = { ADMIN: "Admin portal", CLINIC: "Clinic portal", DOCTOR: "Doctor portal", CUSTOMER: "Patient portal" };
const PORTAL_TONE: Record<Role, "blue" | "aqua" | "green" | "amber"> = { ADMIN: "blue", CLINIC: "aqua", DOCTOR: "green", CUSTOMER: "amber" };
const TABS: { key: "ALL" | Role; label: string }[] = [
  { key: "ALL", label: "All portals" },
  { key: "ADMIN", label: PORTAL.ADMIN },
  { key: "CLINIC", label: PORTAL.CLINIC },
  { key: "DOCTOR", label: PORTAL.DOCTOR },
  { key: "CUSTOMER", label: PORTAL.CUSTOMER },
];
// Name, grid, portal, assigned to, last changed, actions. On a phone each row is a card instead.
const COLS = "1.4fr 1fr 1.2fr 2fr 1.1fr 220px";
const ROW = "flex flex-col gap-3 border-b border-line px-4 py-4 text-sm md:grid md:items-center md:gap-4 md:px-5 md:py-3.5 md:[grid-template-columns:var(--cols)]";

export default function ViewsPage() {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { relative } = useLocalizedFormats();
  const [query, setQuery] = useState("");
  const [gridFilter, setGridFilter] = useState("");
  const [portal, setPortal] = useState<"ALL" | Role>("ALL");
  const q = useDebounced(query.trim());
  const grids = useApi<GridInfo[]>("/views/grids");
  const list = useApi<ViewTemplate[]>(`/admin/view-templates${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  const [creating, setCreating] = useState(false);
  const [newGrid, setNewGrid] = useState("");
  const [sharing, setSharing] = useState<ViewTemplate | null>(null);
  const [deleting, setDeleting] = useState<ViewTemplate | null>(null);
  const [busy, setBusy] = useState(false);

  const gridOf = (key: string) => grids.data?.find((g) => g.key === key);
  const inPortal = (g?: GridInfo) => portal === "ALL" || !!g?.audience.includes(portal);
  const portalGrids = (grids.data ?? []).filter((g) => inPortal(g));
  const templates = (list.data ?? []).filter((x) => inPortal(gridOf(x.grid)) && (!gridFilter || x.grid === gridFilter));
  const builtIns = portalGrids.filter((g) => (!gridFilter || g.key === gridFilter) && (!q || t("Default view").toLowerCase().includes(q.toLowerCase())));
  const audience = (g?: GridInfo) => (g ? g.audience.map((r) => t(PLURAL[r as Role])).join(", ") : "");

  async function duplicate(x: ViewTemplate) {
    try {
      const copy = await api<ViewTemplate>(`/admin/view-templates/${x.id}/duplicate`, { method: "POST" });
      toast(t("Template duplicated."));
      router.push(`/admin/views/${copy.id}`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/admin/view-templates/${deleting.id}`, { method: "DELETE" });
      toast(t("Template deleted."));
      setDeleting(null);
      list.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const defaultFor = (x: ViewTemplate) => [
    ...x.shares.filter((s) => s.role && s.makeDefault).map((s) => t(PLURAL[s.role as Role])),
    ...x.shares.filter((s) => s.userId && s.makeDefault).map((s) => s.userName ?? "—"),
  ];
  /** One chip per user type or account it is assigned to, with a "Default" mark where it is their default. */
  const assignedChips = (x: ViewTemplate) => {
    const withDefault = (label: string, makeDefault: boolean) => (makeDefault ? `${label} · ${t("Default")}` : label);
    const roles = x.shares.filter((sh) => sh.role).map((sh) => ({ key: `r-${sh.role}`, label: withDefault(t("All {who}", { who: t(PLURAL[sh.role as Role]) }), sh.makeDefault), tone: (sh.makeDefault ? "green" : "blue") as "green" | "blue" }));
    const people = x.shares.filter((sh) => sh.userId);
    const shown = people.slice(0, 2).map((sh) => ({ key: `u-${sh.userId}`, label: withDefault(sh.userName ?? "—", sh.makeDefault), tone: (sh.makeDefault ? "green" : "blue") as "green" | "blue" }));
    const more = people.length > 2 ? [{ key: "more", label: t("+{n} more", { n: people.length - 2 }), tone: "quiet" as const }] : [];
    return [...roles, ...shown, ...more];
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{t("Views")}</h1>
        <Button variant="primary" onClick={() => { setNewGrid(grids.data?.[0]?.key ?? ""); setCreating(true); }}>{t("New template")}</Button>
      </div>
      <p className="m-0 max-w-[720px] text-muted">{t("A template is a saved layout for a grid: columns, sorting, filters and grouping. It only changes the layout. Everyone still sees only their own records.")}</p>

      <Tabs tabs={TABS} active={portal} onChange={(key) => { setPortal(key); setGridFilter(""); }} />

      <div className="flex flex-wrap gap-3">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search templates")} aria-label={t("Search templates")} className="max-w-[320px]" />
        <select value={gridFilter} onChange={(e) => setGridFilter(e.target.value)} aria-label={t("Filter by grid")} className="h-11 rounded-lg border border-line bg-surface px-3 text-[15px]">
          <option value="">{t("All grids")}</option>
          {portalGrids.map((g) => <option key={g.key} value={g.key}>{t(g.label)}</option>)}
        </select>
      </div>

      {(list.error || grids.error) && <ErrorState title={t("We couldn't load the templates.")} onRetry={() => { list.reload(); grids.reload(); }} />}
      {(list.loading || grids.loading) && <SkeletonRows rows={6} />}
      {!list.loading && !grids.loading && !list.error && !grids.error && (
        <>
          {(list.data ?? []).length === 0 && !q && !gridFilter && (
            <EmptyState title={t("No templates yet.")} text={t("Every grid has a built-in Default view. Make a template to give clinics, doctors, patients or admins a different layout.")}>
              <Button variant="primary" onClick={() => { setNewGrid(grids.data?.[0]?.key ?? ""); setCreating(true); }}>{t("New template")}</Button>
            </EmptyState>
          )}
          <div className="overflow-hidden rounded-xl border border-line bg-surface" style={{ ["--cols" as string]: COLS }}>
            <div className="hidden gap-4 border-b border-line bg-bg px-5 py-3 text-xs font-semibold uppercase tracking-[.6px] text-muted md:grid md:[grid-template-columns:var(--cols)]">
              {["Name", "Grid", "Portal", "Assigned to", "Last changed", ""].map((h, i) => <span key={i}>{t(h)}</span>)}
            </div>
            {templates.map((x) => {
              const g = gridOf(x.grid);
              const chips = assignedChips(x);
              return (
                <div key={x.id} className={ROW}>
                  <Link href={`/admin/views/${x.id}`} className="text-[15px] font-semibold text-ink no-underline hover:text-accent">{x.name}</Link>
                  <span className="flex items-center gap-2 md:block"><span className="text-xs uppercase tracking-[.6px] text-muted md:hidden">{t("Grid")}</span>{t(g?.label ?? x.grid)}</span>
                  <span className="flex flex-wrap gap-1.5">{(g?.audience ?? []).map((r) => <Chip key={r} label={PORTAL[r as Role]} tone={PORTAL_TONE[r as Role]} />)}</span>
                  <span className="flex flex-wrap gap-1.5">
                    {chips.length ? chips.map((c) => <Chip key={c.key} label={c.label} tone={c.tone} />) : <span title={t("Nobody sees this template yet.")}><Chip label="Not assigned" tone="amber" /></span>}
                  </span>
                  <span className="text-muted">{x.updatedByName ? `${x.updatedByName}, ` : ""}{relative(x.updatedAt)}</span>
                  <span className="flex flex-wrap items-center gap-2 md:justify-end">
                    <LinkButton href={`/admin/views/${x.id}`} size="sm" variant="secondary"><Icon name="edit" size={16} className="me-1.5" />{t("Edit")}</LinkButton>
                    <Button size="sm" variant="secondary" onClick={() => setSharing(x)}><Icon name="share" size={16} className="me-1.5" />{t("Share")}</Button>
                    <Popover label={t("More actions")} align="end" width={180} triggerClassName="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink hover:bg-surface-2" trigger={<Icon name="more" size={18} />}>
                      {(close) => (
                        <div className="flex flex-col">
                          <button onClick={() => { close(); duplicate(x); }} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-start text-sm hover:bg-surface-2"><Icon name="copy" size={16} />{t("Duplicate")}</button>
                          <button onClick={() => { close(); setDeleting(x); }} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-start text-sm text-red hover:bg-red-soft"><Icon name="trash" size={16} />{t("Delete")}</button>
                        </div>
                      )}
                    </Popover>
                  </span>
                </div>
              );
            })}
            {builtIns.map((g) => (
              <div key={`b-${g.key}`} className={`${ROW} bg-bg/50`}>
                <span className="flex items-center gap-2 font-semibold"><Icon name="lock" size={15} className="text-muted" />{t("Default view")} <Chip label="Built-in" tone="quiet" /></span>
                <span className="flex items-center gap-2 md:block"><span className="text-xs uppercase tracking-[.6px] text-muted md:hidden">{t("Grid")}</span>{t(g.label)}</span>
                <span className="flex flex-wrap gap-1.5">{g.audience.map((r) => <Chip key={r} label={PORTAL[r as Role]} tone={PORTAL_TONE[r as Role]} />)}</span>
                <span className="flex flex-wrap gap-1.5"><Chip label="Everyone with this grid" tone="quiet" /></span>
                <span className="text-muted">—</span>
                <span className="text-[13px] text-muted md:text-end">{t("Read-only")}</span>
              </div>
            ))}
            {templates.length === 0 && builtIns.length === 0 && <div className="px-5 py-8 text-center text-muted">{t("No templates match.")}</div>}
          </div>
        </>
      )}

      {creating && (
        <Dialog title={t("New template")} onClose={() => setCreating(false)}>
          <Field label={t("Which grid is it for?")} hint={t("The grid decides who can receive the template.")}>
            <select value={newGrid} onChange={(e) => setNewGrid(e.target.value)} className="h-11 rounded-lg border border-line bg-surface px-3 text-[15px] font-normal">
              {(grids.data ?? []).map((g) => <option key={g.key} value={g.key}>{`${t(g.label)} — ${audience(g)}`}</option>)}
            </select>
          </Field>
          <DialogActions>
            <Button variant="ghost" onClick={() => setCreating(false)}>{t("Cancel")}</Button>
            <Button variant="primary" disabled={!newGrid} onClick={() => router.push(`/admin/views/new?grid=${newGrid}`)}>{t("Continue")}</Button>
          </DialogActions>
        </Dialog>
      )}

      {sharing && gridOf(sharing.grid) && (
        <ShareDialog template={sharing} grid={gridOf(sharing.grid)!} all={list.data ?? []} onClose={() => setSharing(null)} onSaved={() => { setSharing(null); toast(t("Template shared.")); list.reload(); }} />
      )}

      {deleting && (
        <Dialog title={t("Delete “{name}”?", { name: deleting.name })} onClose={() => setDeleting(null)}>
          {defaultFor(deleting).length > 0 && (
            <div role="alert" className="rounded-lg border border-amber-line bg-amber-soft px-3 py-2.5 text-sm text-amber">
              {t("Used as the default for {who}. They will go back to the Default view.", { who: defaultFor(deleting).join(", ") })}
            </div>
          )}
          <p className="m-0 text-muted">{t("This cannot be undone.")}</p>
          <DialogActions>
            <Button variant="ghost" onClick={() => setDeleting(null)}>{t("Cancel")}</Button>
            <Button variant="danger" onClick={remove} loading={busy}>{t("Delete")}</Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}
