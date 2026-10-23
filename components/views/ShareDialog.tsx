"use client";

import { useEffect, useMemo, useState } from "react";
import { useT } from "@/i18n/client";
import { api, ApiError } from "@/lib/api";
import { useDebounced } from "@/lib/useDebounced";
import { ROLE_LABEL } from "@/lib/status";
import type { Page, Role, UserDto } from "@/lib/types";
import type { GridInfo, ViewTemplate } from "@/lib/grid/engine";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Field";

const ROLES: Role[] = ["ADMIN", "CLINIC", "DOCTOR", "CUSTOMER"];
const PLURAL: Record<Role, string> = { ADMIN: "Admins", CLINIC: "Clinics", DOCTOR: "Doctors", CUSTOMER: "Patients" };
const SEARCH_PATH: Partial<Record<Role, string>> = { CLINIC: "/admin/clinics", DOCTOR: "/admin/doctors", CUSTOMER: "/admin/customers" };

interface Pick {
  on: boolean;
  makeDefault: boolean;
}

/** Share a template with user types or single accounts, and optionally make it their default view. */
export function ShareDialog({ template, grid, all, onClose, onSaved }: { template: ViewTemplate; grid: GridInfo; all: ViewTemplate[]; onClose: () => void; onSaved: (t: ViewTemplate) => void }) {
  const t = useT();
  const audience = grid.audience as Role[];
  const [roles, setRoles] = useState<Record<string, Pick>>(() => {
    const init: Record<string, Pick> = {};
    for (const r of ROLES) {
      const s = template.shares.find((x) => x.role === r);
      init[r] = { on: !!s, makeDefault: !!s?.makeDefault };
    }
    return init;
  });
  const [users, setUsers] = useState<{ userId: string; name: string; role: Role; makeDefault: boolean }[]>(
    template.shares.filter((s) => s.userId).map((s) => ({ userId: s.userId!, name: s.userName ?? "—", role: "CUSTOMER" as Role, makeDefault: s.makeDefault })),
  );
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim());
  const [found, setFound] = useState<(UserDto & { kind: Role })[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    if (q.length < 2) return;
    Promise.all(
      audience.filter((r) => SEARCH_PATH[r]).map((r) => api<Page<UserDto>>(`${SEARCH_PATH[r]}?size=5&search=${encodeURIComponent(q)}`).then((p) => p.content.map((u) => ({ ...u, kind: r })))),
    )
      .then((lists) => live && setFound(lists.flat().filter((u) => !users.some((x) => x.userId === u.id))))
      .catch(() => live && setFound([]));
    return () => {
      live = false;
    };
  }, [q, audience, users]);

  // Another template on this grid that is already the default for an audience this one is about to become the default for.
  const replaced = useMemo(() => {
    const out: string[] = [];
    for (const r of audience) {
      if (!roles[r]?.on || !roles[r].makeDefault) continue;
      const other = all.find((o) => o.id !== template.id && o.grid === template.grid && o.shares.some((s) => s.role === r && s.makeDefault));
      if (other) out.push(t("This replaces “{name}” as the default for {who}.", { name: other.name, who: t(PLURAL[r]) }));
    }
    for (const u of users) {
      if (!u.makeDefault) continue;
      const other = all.find((o) => o.id !== template.id && o.grid === template.grid && o.shares.some((s) => s.userId === u.userId && s.makeDefault));
      if (other) out.push(t("This replaces “{name}” as the default for {who}.", { name: other.name, who: u.name }));
    }
    return out;
  }, [roles, users, all, template, audience, t]);

  const summary: string[] = [];
  for (const r of audience) {
    if (roles[r]?.on) summary.push(roles[r].makeDefault ? t("Used as the default for all {who}", { who: t(PLURAL[r]) }) : t("Available to all {who}", { who: t(PLURAL[r]) }));
  }
  if (users.length) summary.push(t("{n} individual accounts", { n: users.length }));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const shares = [
        ...audience.filter((r) => roles[r]?.on).map((r) => ({ role: r, makeDefault: roles[r].makeDefault })),
        ...users.map((u) => ({ userId: u.userId, makeDefault: u.makeDefault })),
      ];
      const saved = await api<ViewTemplate>(`/admin/view-templates/${template.id}/shares`, { method: "PUT", body: { shares } });
      onSaved(saved);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog title={t("Share “{name}”", { name: template.name })} onClose={onClose} width={560}>
      <p className="m-0 text-sm text-muted">{t("A template only changes the layout. Everyone still sees only their own records.")}</p>
      {error && <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">{t(error)}</div>}

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-[.6px] text-muted">{t("User types")}</div>
        {ROLES.map((r) => {
          const allowed = audience.includes(r);
          const pick = roles[r];
          return (
            <div key={r} className={`flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-lg px-2 ${allowed ? "" : "opacity-60"}`}>
              <label className="flex items-center gap-2.5">
                <input type="checkbox" disabled={!allowed} checked={allowed && pick.on} onChange={(e) => setRoles({ ...roles, [r]: { on: e.target.checked, makeDefault: e.target.checked && pick.makeDefault } })} className="h-4 w-4 accent-[#1D6FE8]" />
                <span className="font-medium">{t(PLURAL[r])}</span>
                {!allowed && <span className="text-[13px] text-muted">{t("This grid is not available to {who}.", { who: t(PLURAL[r]) })}</span>}
              </label>
              {allowed && pick.on && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" role="switch" checked={pick.makeDefault} onChange={(e) => setRoles({ ...roles, [r]: { ...pick, makeDefault: e.target.checked } })} className="h-4 w-4 accent-[#1D6FE8]" />
                  {t("Make this their default view")}
                </label>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold uppercase tracking-[.6px] text-muted">{t("Individual accounts")}</div>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search by name or email")} aria-label={t("Search by name or email")} />
        {q.length >= 2 && found.length > 0 && (
          <div className="flex flex-col rounded-lg border border-line">
            {found.map((u) => (
              <button key={u.id} onClick={() => { setUsers([...users, { userId: u.id, name: u.fullName, role: u.kind, makeDefault: false }]); setQuery(""); }} className="flex min-h-11 items-center justify-between gap-2 px-3 text-start hover:bg-bg">
                <span>{u.fullName} <span className="text-muted">· {u.email}</span></span>
                <span className="text-xs text-muted">{t(ROLE_LABEL[u.kind])}</span>
              </button>
            ))}
          </div>
        )}
        {users.map((u) => (
          <div key={u.userId} className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-lg bg-bg px-3">
            <span className="font-medium">{u.name}</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" role="switch" checked={u.makeDefault} onChange={(e) => setUsers(users.map((x) => (x.userId === u.userId ? { ...x, makeDefault: e.target.checked } : x)))} className="h-4 w-4 accent-[#1D6FE8]" />
                {t("Default")}
              </label>
              <button onClick={() => setUsers(users.filter((x) => x.userId !== u.userId))} className="min-h-9 px-1 text-sm text-red">{t("Remove")}</button>
            </div>
          </div>
        ))}
      </div>

      {replaced.map((w) => <div key={w} role="status" className="rounded-lg border border-amber-line bg-amber-soft px-3 py-2.5 text-sm text-amber">{w}</div>)}
      <div className="rounded-lg bg-accent-soft px-3 py-2.5 text-sm text-accent-deep">
        {summary.length ? summary.join(" · ") : t("Not shared with anyone yet.")}
        <div className="mt-1 text-[13px] text-muted">{t("An account's own default beats its user type's default, which beats the built-in Default view.")}</div>
      </div>

      <DialogActions>
        <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="primary" onClick={save} loading={busy}>{t("Confirm")}</Button>
      </DialogActions>
    </Dialog>
  );
}
