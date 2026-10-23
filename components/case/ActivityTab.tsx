"use client";
import {useLocalizedFormats} from "@/i18n/formats";

import {useT} from "@/i18n/client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";

import { JOB_CHIP } from "@/lib/status";
import type { CaseDto, CommentDto, DesignReviewDto, StatusHistoryDto, TransferJobDto } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Field";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const translate = useT();
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
      <h3 className="m-0 text-[17px] font-semibold">{translate(title)}</h3>
      {children}
    </section>
  );
}

const STATUS_WORDS: Record<string, string> = {
  DRAFT: "Case created",
  READY_FOR_SUBMISSION: "Marked ready to submit",
  SUBMISSION_QUEUED: "Sent to Tamaz",
  SUBMITTED_EXTERNAL: "Delivered to Tamaz",
  DESIGN_REJECTED: "Changes requested",
  DESIGN_APPROVED: "Design approved",
  PRODUCTION: "In production",
  SHIPPED: "Shipped",
  COMPLETED: "Completed",
  FAILED: "Delivery problem",
};

export function ActivityTab({
  c,
  comments,
  reviews,
  jobs,
  history,
  onChanged,
}: {
  c: CaseDto;
  comments: CommentDto[] | undefined;
  reviews: DesignReviewDto[] | undefined;
  jobs: TransferJobDto[] | undefined;
  history: StatusHistoryDto[] | undefined;
  onChanged: () => void;
}) {
  const {dateOnly, dateTime} = useLocalizedFormats();
  const translate = useT();
  const [note, setNote] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function addNote() {
    if (!note.trim()) return;
    setNoteBusy(true);
    setNoteError(null);
    try {
      await api(`/cases/${c.id}/comments`, { method: "POST", body: { body: note.trim() } });
      setNote("");
      onChanged();
    } catch (e) {
      setNoteError(e instanceof ApiError ? e.message : "Your note wasn't saved. Try again.");
    } finally {
      setNoteBusy(false);
    }
  }

  async function link() {
    if (!email.trim()) return;
    setLinkBusy(true);
    setLinkError(null);
    try {
      await api(`/cases/${c.id}/customer`, { method: "POST", body: { customerEmail: email.trim() } });
      setEmail("");
      onChanged();
    } catch (e) {
      setLinkError(e instanceof ApiError && e.status === 404 ? "No patient account found with that email." : e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setLinkBusy(false);
    }
  }

  const feedback = [...(reviews ?? [])].reverse();
  const subs = [...(jobs ?? [])].sort((a, b) => b.submissionVersion - a.submissionVersion);
  const timeline = [...(history ?? [])].reverse();

  return (
    <div className="flex flex-col gap-4">
      <Card title={translate("Notes")}>
        {(comments ?? []).length === 0 && <div className="text-muted">{translate("No notes yet.")}</div>}
        {comments?.map((n) => (
          <div key={n.id} className="border-t border-line pt-2.5">
            <div className="text-[13px] text-muted">
              {n.authorName} · {dateTime(n.createdAt)}
            </div>
            <div className="mt-0.5 whitespace-pre-wrap">{n.body}</div>
          </div>
        ))}
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Input placeholder={translate("Write a note")} value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} aria-label={translate("Write a note")} className="flex-1" />
          <Button onClick={addNote} loading={noteBusy} disabled={!note.trim()}>
            {translate("Add note")}</Button>
        </div>
        {noteError && (
          <div role="alert" className="text-sm text-red">
            {translate(noteError)}
          </div>
        )}
        <div className="text-[13px] text-muted">{translate("Your notes are sent to Tamaz with the design.")}</div>
      </Card>

      <Card title={translate("Tamaz feedback")}>
        {feedback.length === 0 && <div className="text-muted">{translate("No feedback yet.")}</div>}
        {feedback.map((f) => (
          <div key={f.id} className="border-t border-line pt-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-semibold">{translate("Version ")}{f.submissionVersion}</span>
              <Chip label={f.decision === "APPROVED" ? translate("Approved") : translate("Changes requested")} tone={f.decision === "APPROVED" ? "aqua" : "amber"} />
              <span className="text-[13px] text-muted">{dateOnly(f.createdAt)}</span>
            </div>
            <div className="mt-1.5 whitespace-pre-wrap">{f.comments || translate("No comments.")}</div>
          </div>
        ))}
      </Card>

      <Card title={translate("Submissions")}>
        {subs.length === 0 && <div className="text-muted">{translate("Nothing has been sent yet.")}</div>}
        {subs.map((s) => {
          const failed = s.status === "FAILED";
          const chipLabel = s.status === "SUCCEEDED" ? "Delivered" : s.status === "FAILED" ? "Couldn't deliver" : s.status === "QUEUED" || s.status === "IN_PROGRESS" ? "Sending" : "";
          return (
            <div key={s.id} className="border-t border-line pt-2.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-semibold">{translate("Version ")}{s.submissionVersion}</span>
                <Chip status={JOB_CHIP[s.status]} label={chipLabel} tone={failed ? "red" : s.status === "SUCCEEDED" ? "aqua" : "blue"} />
                <span className="text-[13px] text-muted">{dateTime(s.createdAt)}</span>
              </div>
              {failed && s.lastError && (
                <div className="mt-2">
                  <button onClick={() => setOpen(open === s.id ? null : s.id)} className="inline-block min-h-8 text-sm text-accent">
                    {open === s.id ? translate("Hide details") : translate("Show details")}
                  </button>
                  {open === s.id && <div className="mt-1 rounded-lg bg-bg px-3 py-2.5 font-mono text-xs text-muted">{s.lastError}</div>}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <Card title={translate("History")}>
        {timeline.map((h) => (
          <div key={h.id} className="flex gap-3">
            <span className="mt-[5px] h-2.5 w-2.5 flex-none rounded-full bg-accent" />
            <div>
              <div className="font-medium">{translate(STATUS_WORDS[h.toStatus] ?? h.toStatus)}</div>
              <div className="text-[13px] text-muted">{dateTime(h.createdAt)}</div>
            </div>
          </div>
        ))}
      </Card>

      <Card title={translate("Patient account")}>
        {c.customerId ? (
          <div className="flex items-center gap-2.5 font-medium text-aqua-deep">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-aqua text-xs text-white">✓</span>
            {translate("Patient account linked.")}</div>
        ) : (
          <>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Input type="email" placeholder={translate("Patient's email")} value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!linkError} aria-label={translate("Patient's email")} className="flex-1" />
              <Button onClick={link} loading={linkBusy} disabled={!email.trim()}>
                {translate("Link patient account")}</Button>
            </div>
            {linkError && (
              <div role="alert" className="text-[13px] text-red">
                {translate(linkError)}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

