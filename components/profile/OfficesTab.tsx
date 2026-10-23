"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { OfficeDto, OfficeInput } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Field";
import { ErrorState, SkeletonBlock } from "@/components/ui/states";
import { useToast } from "@/components/ui/Toast";

const EMPTY: OfficeInput = { name: "", address: "", room: "", note: "", phone: "", email: "", billingAddress: "", billingRoom: "", billingNote: "", billingName: "", vat: "" };

const toInput = (o: OfficeDto): OfficeInput => ({
  name: o.name, address: o.address ?? "", room: o.room ?? "", note: o.note ?? "", phone: o.phone ?? "", email: o.email ?? "",
  billingAddress: o.billingAddress ?? "", billingRoom: o.billingRoom ?? "", billingNote: o.billingNote ?? "", billingName: o.billingName ?? "", vat: o.vat ?? "",
});

/** The Related offices tab: a list of cards, an add and edit dialog, and a delete confirmation. Saved for the owner only; not used when sending yet. */
export function OfficesTab() {
  const translate = useT();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<OfficeDto[]>("/me/offices");
  const [editing, setEditing] = useState<OfficeDto | "new" | null>(null);
  const [deleting, setDeleting] = useState<OfficeDto | null>(null);
  const where = (o: OfficeDto) => [o.address, o.room ? translate("Room {n}", { n: o.room }) : ""].filter(Boolean).join(", ");

  if (loading) return <SkeletonBlock height={220} />;
  if (error || !data) return <ErrorState title={translate("We couldn't load your offices.")} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-xl font-semibold">{translate("Related offices")}</h2>
        <Button variant="primary" onClick={() => setEditing("new")}>{translate("Add office")}</Button>
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-[#A9BBD0] bg-surface px-5 py-10 text-center font-medium">{translate("No offices yet.")}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((o) => (
            <div key={o.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-5">
              <div className="flex flex-col gap-1">
                <div className="break-words text-base font-semibold">{o.name}</div>
                {where(o) && <div className="break-words text-sm text-muted">{where(o)}</div>}
                {o.phone && <div dir="ltr" className="text-start text-sm text-muted">{o.phone}</div>}
              </div>
              <div className="-ms-3 flex gap-2">
                <button type="button" onClick={() => setEditing(o)} className="h-11 px-3 font-medium text-accent-deep" aria-label={`${translate("Edit")}: ${o.name}`}>{translate("Edit")}</button>
                <button type="button" onClick={() => setDeleting(o)} className="h-11 px-3 font-medium text-red" aria-label={`${translate("Delete")}: ${o.name}`}>{translate("Delete")}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <OfficeDialog
          office={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
            toast(translate("Office saved."));
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          office={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={async () => {
            setDeleting(null);
            await reload();
            toast(translate("Office deleted."));
          }}
        />
      )}
    </div>
  );
}

function OfficeDialog({ office, onClose, onSaved }: { office: OfficeDto | null; onClose: () => void; onSaved: () => void | Promise<unknown> }) {
  const translate = useT();
  const [v, setV] = useState<OfficeInput>(() => (office ? toInput(office) : EMPTY));
  const [errors, setErrors] = useState<{ name?: string; email?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof OfficeInput) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  async function save() {
    const next: typeof errors = {};
    if (!v.name.trim()) next.name = "Enter a name for the office.";
    if (v.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email.trim())) next.email = "Check the e-mail address.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const body = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x.trim()]));
      if (office) await api(`/me/offices/${office.id}`, { method: "PUT", body });
      else await api("/me/offices", { method: "POST", body });
      await onSaved();
    } catch (e) {
      setErrors({ form: e instanceof ApiError ? e.message : "Something went wrong. Try again." });
      setBusy(false);
    }
  }

  const field = (label: string, k: keyof OfficeInput, extra: { ltr?: boolean; placeholder?: string; hint?: string; error?: string } = {}) => (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">
      {translate(label)}
      <Input value={v[k]} onChange={set(k)} dir={extra.ltr ? "ltr" : undefined} placeholder={extra.placeholder} invalid={!!extra.error} className={extra.ltr ? "text-start" : ""} />
      {extra.error ? <span role="alert" className="text-[13px] font-normal text-red">{translate(extra.error)}</span> : extra.hint ? <span className="text-[13px] font-normal text-muted">{translate(extra.hint)}</span> : null}
    </label>
  );

  return (
    <Dialog title={office ? "Edit office" : "Add office"} onClose={busy ? () => {} : onClose} width={560}>
      {errors.form && (
        <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">{translate(errors.form)}</div>
      )}
      {field("Name", "name", { error: errors.name })}
      <div role="group" aria-label={translate("Office address")} className="flex flex-col gap-3">
        <div className="text-[15px] font-semibold">{translate("Office address")}</div>
        {field("Address", "address")}
        <div className="grid gap-3 sm:grid-cols-2">{field("Room", "room")}{field("Note", "note")}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {field("Phone", "phone", { ltr: true, placeholder: "+1-201-8428000", hint: "For example +1-201-8428000" })}
        {field("E-mail", "email", { ltr: true, error: errors.email })}
      </div>
      <div role="group" aria-label={translate("Billing address")} className="flex flex-col gap-3">
        <div className="text-[15px] font-semibold">{translate("Billing address")}</div>
        {field("Address", "billingAddress")}
        <div className="grid gap-3 sm:grid-cols-2">{field("Room", "billingRoom")}{field("Note", "billingNote")}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {field("Billing name", "billingName")}
        {field("VAT", "vat", { ltr: true })}
      </div>
      <DialogActions>
        <Button variant="ghost" onClick={onClose} disabled={busy}>{translate("Cancel")}</Button>
        <Button variant="primary" onClick={save} loading={busy} className="px-[22px]">{translate("Save")}</Button>
      </DialogActions>
    </Dialog>
  );
}

function DeleteDialog({ office, onClose, onDeleted }: { office: OfficeDto; onClose: () => void; onDeleted: () => void | Promise<unknown> }) {
  const translate = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const where = [office.address, office.room ? translate("Room {n}", { n: office.room }) : ""].filter(Boolean).join(", ");

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api(`/me/offices/${office.id}`, { method: "DELETE" });
      await onDeleted();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog title={translate("Delete {name}?", { name: office.name })} onClose={busy ? () => {} : onClose}>
      {error && <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">{translate(error)}</div>}
      <div className="leading-relaxed text-muted">
        {translate("{place} will be removed from your profile. This cannot be undone.", { place: [office.name, where].filter(Boolean).join(", ") })}
      </div>
      <DialogActions>
        <Button variant="ghost" onClick={onClose} disabled={busy}>{translate("Cancel")}</Button>
        <Button onClick={remove} loading={busy} className="!border-red !bg-red !text-white px-[22px] hover:!brightness-95">{translate("Delete office")}</Button>
      </DialogActions>
    </Dialog>
  );
}
