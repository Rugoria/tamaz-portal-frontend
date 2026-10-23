"use client";

import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogActions } from "@/components/ui/Dialog";

/** The confirm before a case goes to Tamaz. Shows what is being sent, then sending, or the reason it failed with a retry. */
export function SendDialog({ rows, busy, error, again, onSend, onClose }: { rows: [string, string][]; busy: boolean; error: string | null; again: boolean; onSend: () => void; onClose: () => void }) {
  const t = useT();
  return (
    <Dialog title={t(again ? "Send this case to Tamaz again?" : "Send this case to Tamaz?")} onClose={busy ? () => {} : onClose}>
      <div className="rounded-lg border border-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-line px-4 py-3 last:border-b-0">
            <span className="text-muted">{t(k)}</span>
            <span className="text-end font-medium">{v}</span>
          </div>
        ))}
      </div>
      {busy && <div role="status" className="rounded-lg bg-accent-soft px-3 py-2.5 text-sm text-accent-deep">{t("Sending your case to Tamaz")}</div>}
      {error && <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">{t(error)}</div>}
      <DialogActions>
        <Button variant="ghost" onClick={onClose} disabled={busy}>{t("Cancel")}</Button>
        <Button variant="primary" onClick={onSend} loading={busy} className="bg-[#1B7A3E] px-5">{t(error ? "Try again" : "Send")}</Button>
      </DialogActions>
    </Dialog>
  );
}

/** The confirm before a case that was never sent is deleted. Says exactly what goes with it. */
export function DeleteDialog({ patient, caseNumber, busy, error, onDelete, onClose }: { patient: string; caseNumber: number; busy: boolean; error: string | null; onDelete: () => void; onClose: () => void }) {
  const t = useT();
  return (
    <Dialog title={t("Delete this case?")} onClose={busy ? () => {} : onClose}>
      <p className="m-0">{t("Case {n} of {name} will be deleted with its files, notes and answers. This cannot be undone.", { n: caseNumber, name: patient })}</p>
      <p className="m-0 text-sm text-muted">{t("A case you have already sent to Tamaz cannot be deleted.")}</p>
      {error && <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">{t(error)}</div>}
      <DialogActions>
        <Button variant="ghost" onClick={onClose} disabled={busy}>{t("Cancel")}</Button>
        <Button variant="danger" onClick={onDelete} loading={busy}>{t("Delete case")}</Button>
      </DialogActions>
    </Dialog>
  );
}
