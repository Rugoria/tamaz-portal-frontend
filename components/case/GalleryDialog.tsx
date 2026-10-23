"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { useLocalizedFormats } from "@/i18n/formats";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { GalleryPhotoDto } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { ErrorState } from "@/components/ui/states";

/** The patient's photos from their other cases, so the same picture does not have to be taken or uploaded again. */
export function GalleryDialog({ caseId, requirementId, onClose, onAdded }: { caseId: string; requirementId: string | null; onClose: () => void; onAdded: () => void | Promise<unknown> }) {
  const t = useT();
  const { dateOnly } = useLocalizedFormats();
  const { data, error, loading, reload } = useApi<GalleryPhotoDto[]>(`/cases/${caseId}/files/gallery`);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function add() {
    setBusy(true);
    setMessage(null);
    try {
      for (const id of picked) {
        await api(`/cases/${caseId}/files/from-gallery`, { method: "POST", body: { sourceFileId: id, requirementId } });
      }
      await onAdded();
      onClose();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog title={t("Add from this patient's photos")} onClose={busy ? () => {} : onClose} width={720}>
      <div className="text-sm text-muted">{t("Photos from this patient's other cases. A copy is added to this case; the original stays where it is.")}</div>
      {error && <ErrorState title={t("We couldn't load the photos.")} onRetry={reload} />}
      {loading && <div className="tz-pulse h-32 rounded-lg bg-surface-2" aria-busy="true" />}
      {data && data.length === 0 && <div className="rounded-lg border border-dashed border-[#A9BBD0] p-6 text-center text-muted">{t("This patient has no photos on other cases yet.")}</div>}
      {data && data.length > 0 && (
        <div className="grid max-h-[380px] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
          {data.map((g) => (
            <button key={g.fileId} type="button" onClick={() => toggle(g.fileId)} aria-pressed={picked.has(g.fileId)}
              className={`flex flex-col gap-1.5 rounded-lg border p-2 text-start ${picked.has(g.fileId) ? "border-accent bg-accent-soft" : "border-line hover:bg-bg"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.url} alt={g.originalFilename} className="h-28 w-full rounded-md bg-surface-2 object-cover" />
              <span className="break-all text-xs font-medium">{g.originalFilename}</span>
              <span className="text-xs text-muted">{t("Case ")}{g.caseNumber} · {dateOnly(g.capturedOn ?? g.createdAt)}</span>
            </button>
          ))}
        </div>
      )}
      {message && <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">{t(message)}</div>}
      <DialogActions>
        <Button variant="ghost" onClick={onClose} disabled={busy}>{t("Cancel")}</Button>
        <Button variant="primary" onClick={add} disabled={picked.size === 0} loading={busy}>{t("Add {n} photos", { n: picked.size })}</Button>
      </DialogActions>
    </Dialog>
  );
}
