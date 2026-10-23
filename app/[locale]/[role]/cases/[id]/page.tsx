"use client";
import {useLocalizedFormats} from "@/i18n/formats";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { use, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";

import { SHOW_PENDING } from "@/lib/pending";
import { CASE_CHIP, STAFF_BANNER } from "@/lib/status";
import { useApi } from "@/lib/hooks";
import type { CaseStatus, DoctorProfileDto, StatusHistoryDto } from "@/lib/types";
import { ActivityTab } from "@/components/case/ActivityTab";
import { useCaseBundle } from "@/components/case/useCaseBundle";
import { DeleteDialog, SendDialog } from "@/components/case/steps/CaseDialogs";
import { DeliveryStep, PaymentStep } from "@/components/case/steps/DeliveryPaymentSteps";
import { PlanStep } from "@/components/case/steps/PlanStep";
import { RecordsStep } from "@/components/case/steps/RecordsStep";
import { PlanReviewPanel } from "@/components/case/PlanReviewPanel";
import { StepCard, type StepInfo, type StepState } from "@/components/case/steps/StepCard";
import { EMPTY_DELIVERY, EMPTY_PAYMENT, EMPTY_PLAN, paymentDone, planDone, useWorkflowDraft } from "@/components/case/steps/useWorkflowDraft";
import { JourneyPanel } from "@/components/features/JourneyPanel";
import { Button, buttonClass } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { LoadError, PendingTag, PreviewNote, SkeletonBlock } from "@/components/ui/states";
import { Icon } from "@/components/shell/Icon";

/** The backend explains why a send is refused. Two reasons get the design's friendlier wording. */
function friendly(message: string, translate: (s: string, v?: Record<string, string | number>) => string): string {
  const m = message.toLowerCase();
  if (m.includes("contact number")) return "Add your contact number in your profile first";
  if (m.includes("shipping address")) return "The company shipping address isn't set yet. Ask the tamaz team to add it.";
  if (m.includes("required records are missing")) return translate("Some required records are missing: {list}", { list: message.split(":").slice(1).join(":").trim() });
  return message;
}

const BANNER_TONE = {
  p: "border-line bg-surface",
  a: "border-amber-line bg-amber-soft",
  r: "border-red-line bg-red-soft",
} as const;

const STEP_TITLES = ["Records", "Treatment plan", "Delivery", "Payment"];
const STEP_HELP = ["Add the required 3D models and photos.", "Write the treatment plan.", "Check where the aligners go.", "Choose who pays and how."];
const EDITABLE: CaseStatus[] = ["DRAFT", "READY_FOR_SUBMISSION", "DESIGN_REJECTED", "FAILED"];

export default function StaffCasePage({ params }: { params: Promise<{ role: string; id: string }> }) {
  const {dateOnly} = useLocalizedFormats();
  const translate = useT();
  const router = useRouter();
  const { role, id } = use(params);
  const base = `/${role}`;
  const { c, files, readiness, comments, reviews, jobs, history, reloadAll } = useCaseBundle(id);
  // SimplyCeph needs the sender's contact number, so a clinic or doctor without one cannot send (user, 2026-10-19).
  const myProfile = useApi<DoctorProfileDto>("/me/profile");

  const status = c.data?.status;
  const editable = !!status && EDITABLE.includes(status);
  // Steps 2 to 4 are waiting on the client; with NEXT_PUBLIC_SHOW_PENDING=false only the records step is left.
  const stepCount = SHOW_PENDING ? 4 : 1;
  const wf = useWorkflowDraft(id, editable && SHOW_PENDING);

  const [view, setView] = useState<"steps" | "activity">("steps");
  const [open, setOpen] = useState<number | null>(null);
  // The step the page opens on (the first one still to do) is decided once, when everything has loaded. After that the page
  // never moves by itself: only Continue and the step card change the step.
  const [anchor, setAnchor] = useState<number | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [chat, setChat] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const models = files.data?.filter((f) => f.fileType === "STL") ?? [];
  const photos = files.data?.filter((f) => f.fileType === "PHOTO") ?? [];

  // After a rejection a corrected scan must be uploaded before the case can be sent again.
  const lastReview = reviews.data?.length ? reviews.data[reviews.data.length - 1] : undefined;
  const fixed = !!lastReview && models.some((f) => f.createdAt > lastReview.createdAt);

  const done = useMemo(
    () => [!!readiness.data?.ready, planDone(wf.draft), true, paymentDone(wf.draft)].slice(0, stepCount),
    [readiness.data?.ready, wf.draft, stepCount],
  );
  const firstTodo = editable ? done.findIndex((d) => !d) : -1;
  const first = firstTodo === -1 ? stepCount - 1 : firstTodo;
  const dataReady = !!c.data && !!readiness.data && (wf.ready || !SHOW_PENDING);
  if (anchor === null && dataReady) setAnchor(first);
  const current = Math.min(open ?? anchor ?? 0, stepCount - 1);

  const dates = journeyDates(history.data, dateOnly);

  if (c.loading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonBlock height={40} />
        <SkeletonBlock height={200} />
        <SkeletonBlock height={160} />
      </div>
    );
  }
  if (c.error || !c.data) return <LoadError error={c.error} what="case" onRetry={c.reload} backHref={`${base}/patients`} backLabel={translate("Back to patients")} />;

  const cs = c.data;
  const banner = STAFF_BANNER[cs.status];
  const canDelete = cs.status === "DRAFT" || cs.status === "READY_FOR_SUBMISSION";
  const stateOf = (i: number): StepState => (!editable || i < first || (firstTodo === -1) ? "done" : i === first ? "cur" : "locked");
  const steps: StepInfo[] = Array.from({ length: stepCount }, (_, i) => ({ title: STEP_TITLES[i], state: stateOf(i), open: i === current && view === "steps", instruction: STEP_HELP[i], pending: i >= 1 }));

  const allDone = done.every(Boolean);
  const isLast = current === stepCount - 1;
  const again = cs.status === "DESIGN_REJECTED";
  const needsFix = again && !fixed;
  const complete = done[current];

  // What is missing, in one short line under the button.
  let missing = "";
  if (wf.state === "saving") missing = "Saving your changes…";
  else if (!complete) {
    if (current === 0) missing = translate("Add {label} to continue", { label: translate(readiness.data?.missing[0] ?? "the required records") });
    else if (current === 1) missing = translate("Write the treatment plan to continue");
    else if (current === 3) missing = translate("Choose who pays and how to continue");
  } else if (isLast && !allDone) missing = translate("Finish the earlier steps to send");
  else if (isLast && needsFix) missing = translate("Upload a corrected design file first.");
  const noPhone = isLast && editable && !!myProfile.data && !myProfile.data.contactNumber;
  if (noPhone) missing = translate("Add your contact number in your profile first");

  const primaryLabel = isLast ? translate(again ? "Send again" : "Send to Tamaz") : translate("Continue");
  const primaryOff = !complete || wf.state === "saving" || noPhone || (isLast && (!allDone || needsFix));

  async function next() {
    if (isLast) {
      setDialogError(null);
      setSendOpen(true);
      return;
    }
    if (!(await wf.flush())) return;
    setOpen(current + 1);
    setView("steps");
  }

  async function act(path: string) {
    setBusy(true);
    setActionError(null);
    try {
      await api(`/cases/${id}/${path}`, { method: "POST" });
      await reloadAll();
    } catch (e) {
      setActionError(friendly(e instanceof ApiError ? e.message : "Something went wrong. Try again.", translate));
    } finally {
      setBusy(false);
    }
  }

  async function doSend() {
    setBusy(true);
    setDialogError(null);
    try {
      if (cs.status === "DRAFT") await api(`/cases/${id}/ready-for-submission`, { method: "POST" });
      await api(`/cases/${id}/send`, { method: "POST" });
      setSendOpen(false);
      setOpen(0);
      await reloadAll();
    } catch (e) {
      setDialogError(friendly(e instanceof ApiError ? e.message : "Something went wrong. Try again.", translate));
      await reloadAll();
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    setBusy(true);
    setDialogError(null);
    try {
      await api(`/cases/${id}`, { method: "DELETE" });
      router.push(`${base}/patients?p=${encodeURIComponent(cs.patientFullName.trim().toLowerCase())}`);
    } catch (e) {
      setDialogError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  const openStep = (i: number) => {
    setOpen(i);
    setView("steps");
  };

  const plan = wf.draft.plan ?? EMPTY_PLAN;
  const delivery = wf.draft.delivery ?? EMPTY_DELIVERY;
  const payment = wf.draft.payment ?? EMPTY_PAYMENT;
  const locked = !editable;

  return (
    <div className="flex w-full flex-col gap-4">
      <Link href={`${base}/patients?p=${encodeURIComponent(cs.patientFullName.trim().toLowerCase())}`} className="-mb-3 flex min-h-11 items-center text-sm no-underline">
        ← {cs.patientFullName}
      </Link>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("Case ")}{cs.caseNumber ?? ""}</h1>
            <span className="text-sm text-muted">
              {cs.patientFullName} {translate(" · Created ")}{dateOnly(cs.createdAt)}
            </span>
          </div>
          <Chip status={CASE_CHIP[cs.status]} />
          {canDelete && (
            <button onClick={() => { setDialogError(null); setDeleteOpen(true); }} className="min-h-11 px-2 text-sm font-medium text-red">{translate("Delete case")}</button>
          )}
        </div>

        {view === "steps" && editable && (
          <div className="flex flex-col gap-1.5 md:items-end">
            <Button variant="primary" onClick={next} disabled={primaryOff || busy} className={`px-[22px] ${isLast ? "!bg-[#1B7A3E] disabled:!bg-surface-2" : ""}`}>
              {primaryLabel}
            </Button>
            {missing && <span className="max-w-[320px] text-[13px] text-muted md:text-end" role="status">{missing}</span>}
          </div>
        )}
      </div>

      <PlanReviewPanel caseId={id} underReview={cs.status === "SUBMITTED_EXTERNAL"} onChanged={reloadAll} />

      <JourneyPanel
        status={cs.status}
        eyebrow={translate("Case progress")}
        pauseText={
          cs.status === "DESIGN_REJECTED" ? translate("Paused until you upload corrected files and send again.") : cs.status === "FAILED" ? translate("Paused until the case is delivered.") : undefined
        }
        dates={dates}
      />

      {actionError && (
        <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-4 py-3 font-medium text-red">
          {translate(actionError)}
        </div>
      )}

      {cs.status !== "DRAFT" && (
        <section className={`grid gap-x-6 gap-y-3.5 rounded-xl border px-5 py-[18px] md:grid-cols-[1fr_1.6fr_1.6fr] ${BANNER_TONE[banner.tone]}`}>
          {[
            ["Stage", banner.stage, true],
            ["Status", banner.status, false],
            ["Help", banner.help, false],
          ].map(([k, v, bold]) => (
            <div key={k as string}>
              <div className="text-xs font-semibold uppercase tracking-[.8px] text-aqua-deep">{k as string}</div>
              <div className={`mt-1 ${bold ? "font-semibold" : ""}`}>{v as string}</div>
            </div>
          ))}
        </section>
      )}

      {cs.status === "DESIGN_REJECTED" && lastReview && (
        <section className="flex flex-col gap-3 rounded-xl border border-amber-line bg-amber-soft px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-[.8px] text-amber">{translate("Tamaz asked for changes")}</div>
          <div className="font-semibold">
            {translate("Version ")}{lastReview.submissionVersion}, {dateOnly(lastReview.createdAt)}
          </div>
          <div className="whitespace-pre-wrap leading-relaxed">{lastReview.comments || translate("No comments.")}</div>
          {(reviews.data?.length ?? 0) > 1 &&
            reviews.data!
              .slice(0, -1)
              .reverse()
              .map((r) => (
                <div key={r.id} className="border-t border-amber-line pt-2.5 text-sm text-[#5C4200]">
                  <b>
                    {translate("Version ")}{r.submissionVersion}, {dateOnly(r.createdAt)}.
                  </b>{" "}
                  {r.comments || translate("No comments.")}
                </div>
              ))}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => openStep(0)}>{translate("Upload a corrected scan")}</Button>
            {!fixed && <span className="text-sm text-[#5C4200]">{translate("Upload a corrected design file first.")}</span>}
          </div>
        </section>
      )}

      {cs.status === "FAILED" && (
        <section className="flex flex-col justify-between gap-3.5 rounded-xl border border-red-line bg-red-soft px-6 py-5 md:flex-row md:items-center">
          <div>
            <div className="font-semibold text-red">{translate("We couldn&apos;t deliver this case to Tamaz.")}</div>
            <div className="mt-1 text-sm">{translate("The tamaz team has been told. You can try sending it again.")}</div>
          </div>
          <Button variant="primary" onClick={() => act("send")} loading={busy} className="px-5">
            {translate("Try sending again")}</Button>
        </section>
      )}

      <div className="grid items-start gap-5 md:grid-cols-[250px_minmax(0,1fr)] lg:grid-cols-[290px_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <div className="hidden md:block"><StepCard steps={steps} onOpen={openStep} /></div>
          <div className="md:hidden"><StepCard steps={steps} onOpen={openStep} phone /></div>
          <button
            type="button"
            onClick={() => setView(view === "activity" ? "steps" : "activity")}
            aria-pressed={view === "activity"}
            className={`flex min-h-11 items-center justify-between rounded-xl border px-4 text-start font-medium ${view === "activity" ? "border-accent bg-accent-soft text-accent-deep" : "border-line bg-surface"}`}
          >
            {translate("Activity and notes")}
          </button>
          {editable && <p className="m-0 px-1 text-[13px] text-muted">{translate("You can go back to a finished step. Later steps check themselves again.")}</p>}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {view === "activity" ? (
            <ActivityTab c={cs} comments={comments.data} reviews={reviews.data} jobs={jobs.data} history={history.data} onChanged={reloadAll} />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[.8px] text-muted">{translate("Step {n} of {total}", { n: current + 1, total: stepCount })}</div>
                  <h2 className="m-0 text-xl font-semibold">{translate(STEP_TITLES[current])}{current >= 1 && <PendingTag />}</h2>
                  <div className="text-sm text-muted">{translate(STEP_HELP[current])}</div>
                </div>
                {current >= 1 && editable && (
                  <span role="status" className="text-sm" style={{ color: wf.state === "failed" ? "#B3261E" : "#52657E" }}>
                    {wf.state === "saving" && translate("Saving…")}
                    {wf.state === "saved" && `✓ ${translate("Saved")}`}
                    {wf.state === "failed" && (
                      <>
                        {translate("We couldn't save your changes.")}{" "}
                        <button onClick={() => void wf.flush()} className="font-medium underline">{translate("Retry")}</button>
                      </>
                    )}
                  </span>
                )}
              </div>

              {noPhone && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-amber-line bg-amber-soft px-4 py-3 text-pending-ink">
                  <span className="font-medium">{translate("Add your contact number in your profile first")}</span>
                  <Link href={`${base}/profile`} className="flex min-h-11 items-center font-medium text-accent-deep">{translate("Open profile")}</Link>
                </div>
              )}
              {current === 0 && (
                <RecordsStep caseId={id} files={files.data} filesError={!!files.error} readiness={readiness.data} editable={editable} onChanged={reloadAll} onRetry={files.reload} />
              )}
              {current >= 1 && !wf.ready && <SkeletonBlock height={260} />}
              {current >= 1 && wf.ready && wf.loadError && <LoadError error={undefined} what="steps" onRetry={wf.reload} backHref={base} backLabel={translate("Back")} />}
              {current === 1 && wf.ready && !wf.loadError && (
                <PlanStep plan={plan} onChange={(p) => wf.update({ plan: p })} disabled={locked} showErrors={!!wf.draft.plan} />
              )}
              {current === 2 && wf.ready && !wf.loadError && <DeliveryStep delivery={delivery} onChange={(d) => wf.update({ delivery: d })} disabled={locked} />}
              {current === 3 && wf.ready && !wf.loadError && (
                <PaymentStep payment={payment} onChange={(p) => wf.update({ payment: p })} disabled={locked} showErrors={!!wf.draft.payment} />
              )}
              {current >= 1 && <PreviewNote>{translate("This step is waiting on the client. Your answers are kept with the case, but they are not sent yet.")}</PreviewNote>}
            </>
          )}
        </div>
      </div>

      {SHOW_PENDING && (
        <div className="text-sm text-muted">
          <PendingTag text={translate("Preview")} />
          <Link href={`${base}/cases/${id}/review-preview`} className="ms-1">
            {translate("See the design review screen (approve or revise a virtual setup)")}</Link>
        </div>
      )}

      {SHOW_PENDING && (
        <button onClick={() => setChat(true)} aria-label={translate("Chat with Tamaz")} className="fixed bottom-5 end-5 z-30 flex h-12 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-white shadow-[0_8px_24px_rgba(11,31,58,.2)]">
          <Icon name="messages" size={18} /> {translate("Chat with Tamaz")}
        </button>
      )}

      {sendOpen && (
        <SendDialog
          again={again}
          busy={busy}
          error={dialogError}
          onSend={doSend}
          onClose={() => setSendOpen(false)}
          rows={[
            ["Patient", cs.patientFullName],
            ["3D models", String(models.length)],
            ["Photos", String(photos.length)],
            ["Notes", String(comments.data?.length ?? 0)],
            ["Sent to", "Tamaz"],
          ]}
        />
      )}
      {deleteOpen && <DeleteDialog patient={cs.patientFullName} caseNumber={cs.caseNumber} busy={busy} error={dialogError} onDelete={doDelete} onClose={() => setDeleteOpen(false)} />}
      {chat && <CaseChat onClose={() => setChat(false)} patient={cs.patientFullName} />}
    </div>
  );
}

/** First date each progress step was reached, from the status history. */
function journeyDates(history: StatusHistoryDto[] | undefined, dateOnly: (iso: string) => string): (string | undefined)[] {
  const first = (s: CaseStatus) => history?.find((h) => h.toStatus === s)?.createdAt;
  const d = (iso?: string) => (iso ? dateOnly(iso) : undefined);
  return [d(history?.[0]?.createdAt), d(first("SUBMITTED_EXTERNAL")), d(first("DESIGN_APPROVED")), d(first("PRODUCTION")), d(first("SHIPPED")), d(first("COMPLETED"))];
}

/** Preview only: a chat tied to one case (an idea from the design, not yet decided). Nothing is sent. */
function CaseChat({ onClose, patient }: { onClose: () => void; patient: string }) {
  const translate = useT();
  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(11,31,58,.45)" }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label={translate("Case chat")} className="flex h-full w-full max-w-[420px] flex-col bg-surface shadow-[0_8px_24px_rgba(11,31,58,.18)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <div className="font-semibold">{translate("Case chat")}</div>
            <div className="text-[13px] text-muted">{patient}</div>
          </div>
          <button onClick={onClose} className="h-11 px-2 text-sm text-muted">
            {translate("Close")}</button>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-5">
          <PreviewNote>{translate("A chat for one case isn&apos;t built. Whether chats belong to cases is waiting on the client. Use Messages for now.")}</PreviewNote>
        </div>
        <div className="border-t border-line p-4">
          <div className="flex gap-2">
            <input disabled placeholder={translate("Write a message")} className="h-11 flex-1 rounded-lg border border-line px-3" aria-label={translate("Write a message")} />
            <button disabled className={buttonClass("primary", "md")}>
              {translate("Send")}</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
