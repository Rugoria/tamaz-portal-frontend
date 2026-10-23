"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { RecordRequirementDto } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Field";
import { ErrorState, PendingTag } from "@/components/ui/states";
import { useToast } from "@/components/ui/Toast";

/**
 * The records every case must have before it can be submitted. The client has not named the required STL models or
 * photo views (docs/open-questions.md), so the list is set here and starts empty. While it is empty a case needs one STL
 * model and one photo.
 */
export function RequiredRecords() {
  const t = useT();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<RecordRequirementDto[]>("/admin/record-requirements");
  const [kind, setKind] = useState<"STL" | "PHOTO">("STL");
  const [label, setLabel] = useState("");
  const [required, setRequired] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>, done: string) {
    setBusy(true);
    setFormError(null);
    try {
      await fn();
      await reload();
      toast(t(done));
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const add = () => run(async () => {
    await api("/admin/record-requirements", { method: "POST", body: { kind, label, required } });
    setLabel("");
  }, "Required record added.");

  if (error) return <ErrorState title={t("We couldn't load the required records.")} onRetry={reload} />;
  const active = (data ?? []).filter((r) => r.active);

  return (
    <section className="flex max-w-[720px] flex-col gap-3 rounded-xl border border-line bg-surface p-6">
      <h2 className="m-0 text-lg font-semibold">{t("Required records")}<PendingTag text={t("Waiting on the client")} /></h2>
      <p className="m-0 text-sm text-muted">
        {t("A case cannot be submitted until every record below is uploaded. The client has not said which STL models and photo views are required, so add them here once they do.")}
      </p>
      {!loading && active.length === 0 && (
        <div className="rounded-lg border border-amber-line bg-amber-soft px-3 py-2.5 text-sm text-amber">
          {t("Nothing is listed, so every case needs one STL model and one photo.")}
        </div>
      )}
      {(data ?? []).map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{r.label}</span>
            <Chip label={r.kind === "STL" ? "3D model (STL)" : "Photo"} tone="blue" />
            {!r.active && <Chip label="Off" tone="neutral" />}
            <Chip label={r.required ? "Required" : "Optional"} tone={r.required ? "aqua" : "quiet"} />
          </div>
          <div className="flex gap-3">
            <button disabled={busy} onClick={() => run(() => api(`/admin/record-requirements/${r.id}`, { method: "PUT", body: { required: !r.required } }), r.required ? "Now optional." : "Now required.")} className="min-h-9 text-sm font-medium text-accent-deep">
              {t(r.required ? "Make optional" : "Make required")}
            </button>
            <button disabled={busy} onClick={() => run(() => api(`/admin/record-requirements/${r.id}`, { method: "PUT", body: { active: !r.active } }), r.active ? "Required record switched off." : "Required record switched on.")} className="min-h-9 text-sm font-medium text-accent-deep">
              {t(r.active ? "Switch off" : "Switch on")}
            </button>
            <button disabled={busy} onClick={() => run(() => api(`/admin/record-requirements/${r.id}`, { method: "DELETE" }), "Required record removed.")} className="min-h-9 text-sm font-medium text-red">{t("Remove")}</button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("Type")}
          <select value={kind} onChange={(e) => setKind(e.target.value as "STL" | "PHOTO")} className="h-11 rounded-lg border border-line bg-surface px-3 text-[15px] font-normal">
            <option value="STL">{t("3D model (STL)")}</option>
            <option value="PHOTO">{t("Photo")}</option>
          </select>
        </label>
        <label className="flex min-w-[220px] flex-1 flex-col gap-1.5 text-sm font-medium">
          {t("Name")}
          <Input value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && label.trim() && add()} placeholder={t("What the doctor sees, for example the view or arch")} />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="h-4 w-4 accent-[#1D6FE8]" />{t("Required")}</label>
        <Button variant="primary" onClick={add} disabled={!label.trim() || busy}>{t("Add")}</Button>
      </div>
      {formError && <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">{t(formError)}</div>}
    </section>
  );
}
