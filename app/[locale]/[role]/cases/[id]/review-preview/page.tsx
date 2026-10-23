"use client";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import { use, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Field, Textarea } from "@/components/ui/Field";
import { PendingTag, PreviewNote } from "@/components/ui/states";

/**
 * Preview only. Clear Moves' own portal has the doctor approve or revise a "virtual setup" in a 3D viewer. That is not
 * what the client described, so which workflow applies is still open (CLAUDE.md section 9 #16). Nothing here is saved.
 */
export default function ReviewPreviewPage({ params }: { params: Promise<{ role: string; id: string }> }) {
  const translate = useT();
  const { role, id } = use(params);
  const [view, setView] = useState("Front");
  const [step, setStep] = useState(12);
  const [dialog, setDialog] = useState<"approve" | "revise" | null>(null);
  const [comment, setComment] = useState("");
  const [needComment, setNeedComment] = useState(false);

  return (
    <div className="flex w-full flex-col gap-4">
      <Link href={`/${role}/cases/${id}`} className="flex min-h-11 items-center text-sm no-underline">
        {translate("← Back to the case")}</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-semibold md:text-[28px]">
          {translate("Acceptance of the design ")}<PendingTag />
        </h1>
        <div className="flex gap-3">
          <Button onClick={() => setDialog("revise")}>{translate("Revise")}</Button>
          <Button variant="primary" onClick={() => setDialog("approve")} className="px-[22px]">
            {translate("Approve")}</Button>
        </div>
      </div>
      <PreviewNote>{translate("This screen is a preview of an approval step that may not apply. Approving or revising here saves nothing.")}</PreviewNote>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-wrap gap-2">
            {["Front", "Left", "Right", "Back"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`min-h-11 rounded-lg border px-4 font-medium ${view === v ? "border-accent bg-accent-soft text-accent-deep" : "border-line bg-surface"}`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex h-[260px] items-center justify-center rounded-lg bg-surface-2 p-3 text-center text-muted md:h-[340px]">{translate("3D viewport: teeth model placeholder (")}{view})</div>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={24} value={step} onChange={(e) => setStep(Number(e.target.value))} className="flex-1" aria-label={translate("Treatment step")} />
            <span className="whitespace-nowrap text-sm text-muted">{translate("Step ")}{step} {translate(" of 24")}</span>
          </div>
        </section>
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-4">
            <div className="font-semibold">{translate("Versions")}</div>
            <div className="flex gap-2">
              <span className="inline-flex min-h-11 items-center rounded-lg border border-line px-3.5">{translate("Version 1")}</span>
              <span className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-accent bg-accent-soft px-3.5 font-semibold text-accent-deep">
                {translate("Version 2 ")}<span className="h-2 w-2 rounded-full bg-accent" />
              </span>
            </div>
          </section>
          <section className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface p-4">
            <div className="font-semibold">{translate("Layers")}</div>
            {["Upper", "Lower", "Attachments"].map((l) => (
              <label key={l} className="flex min-h-11 items-center gap-2.5">
                <input type="checkbox" defaultChecked className="h-5 w-5 accent-[var(--accent)]" />
                {l}
              </label>
            ))}
          </section>
          <Chip label={translate("Design ready for review")} tone="amber" />
        </div>
      </div>

      {dialog === "approve" && (
        <Dialog title={translate("Approve this design?")} onClose={() => setDialog(null)}>
          <p className="m-0 text-sm text-muted">{translate("Approving lets the aligners be made. This preview does not save anything.")}</p>
          <DialogActions>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {translate("Cancel")}</Button>
            <Button variant="primary" onClick={() => setDialog(null)} className="px-5">
              {translate("Approve")}</Button>
          </DialogActions>
        </Dialog>
      )}
      {dialog === "revise" && (
        <Dialog title={translate("Ask for a revision")} onClose={() => setDialog(null)}>
          <Field label={translate("What should change?")} error={needComment ? "Add a comment so Tamaz knows what to change." : null}>
            <Textarea rows={4} value={comment} onChange={(e) => (setComment(e.target.value), setNeedComment(false))} invalid={needComment} />
          </Field>
          <DialogActions>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {translate("Cancel")}</Button>
            <Button
              variant="primary"
              onClick={() => (comment.trim() ? setDialog(null) : setNeedComment(true))}
              className="px-5"
            >
              {translate("Send revision request")}</Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}
