"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { pollMs, useRealtimeLive } from "@/lib/realtime";
import type { PlanReviewDto } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Field, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

const MIN_REASON = 10;

/**
 * The treatment plan waiting for the doctor: shown on the case page while the case is under review and the manufacturer has made a plan nobody has decided on.
 * The doctor approves it or sends it back with a reason. A new plan is announced live; it also looks again every half minute without the live stream (every two minutes with it) and when the tab is focused again.
 */
export function PlanReviewPanel({ caseId, underReview, onChanged }: { caseId: string; underReview: boolean; onChanged: () => void | Promise<unknown> }) {
  const translate = useT();
  const toast = useToast();
  const streaming = useRealtimeLive();
  const { data, reload } = useApi<PlanReviewDto>(underReview ? `/cases/${caseId}/plan-review` : null, { refreshInterval: pollMs(30000, streaming), revalidateOnFocus: true });
  const [dialog, setDialog] = useState<"approve" | "changes" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!underReview || !data?.pending) return null;

  const close = () => {
    setDialog(null);
    setError(null);
  };

  async function run(path: string, body: unknown, done: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/cases/${caseId}/plan-review/${path}`, { method: "POST", body });
      setDialog(null);
      setReason("");
      toast(translate(done));
      await reload();
      await onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const tooShort = reason.trim().length < MIN_REASON;

  return (
    <>
      <section role="status" className="flex flex-col gap-3 rounded-xl border border-amber-line bg-amber-soft p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-lg font-semibold text-pending-ink">{translate("Your treatment plan is ready for review")}</h2>
          <p className="m-0 text-sm text-pending-ink">{translate("Tamaz has prepared your treatment plan. Check it, then approve it or ask for changes.")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {data.canRequestChanges && <Button onClick={() => { setError(null); setDialog("changes"); }}>{translate("Request changes")}</Button>}
          {data.canApprove && <Button variant="primary" onClick={() => { setError(null); setDialog("approve"); }} className="px-[22px]">{translate("Approve plan")}</Button>}
        </div>
      </section>

      {dialog === "approve" && (
        <Dialog title="Approve this plan?" onClose={busy ? () => {} : close}>
          {error && <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">{translate(error)}</div>}
          <div className="leading-relaxed text-muted">{translate("Approving lets Tamaz go ahead and make your aligners. You can't undo it.")}</div>
          <DialogActions>
            <Button variant="ghost" onClick={close} disabled={busy}>{translate("Cancel")}</Button>
            <Button variant="primary" onClick={() => run("approve", undefined, "Plan approved.")} loading={busy} className="px-[22px]">{translate("Approve plan")}</Button>
          </DialogActions>
        </Dialog>
      )}

      {dialog === "changes" && (
        <Dialog title="Request changes" onClose={busy ? () => {} : close} width={520}>
          {error && <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">{translate(error)}</div>}
          <Field label="What should change?" hint="Tell Tamaz what to change (at least 10 characters).">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} className="h-[140px]" />
          </Field>
          <DialogActions>
            <Button variant="ghost" onClick={close} disabled={busy}>{translate("Cancel")}</Button>
            <Button variant="primary" onClick={() => run("request-changes", { reason: reason.trim() }, "Your request was sent to Tamaz.")} disabled={tooShort} loading={busy} className="px-[22px]">
              {translate("Request changes")}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
