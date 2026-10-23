"use client";
import {useLocalizedFormats} from "@/i18n/formats";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { use, useState } from "react";
import { api, ApiError } from "@/lib/api";
import {fileSize} from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { SHOW_PENDING } from "@/lib/pending";
import { CASE_CHIP, JOB_CHIP, PAYMENT_LABEL, ROLE_LABEL } from "@/lib/status";
import type { ConversationDto, DoctorProfileDto, DownloadUrlDto } from "@/lib/types";
import { useCaseBundle } from "@/components/case/useCaseBundle";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { LoadError, PendingTag, SkeletonBlock } from "@/components/ui/states";

function Card({ title, children, pending }: { title: string; children: React.ReactNode; pending?: boolean }) {
  const translate = useT();
  return (
    <section className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-5">
      <h3 className="m-0 text-[17px] font-semibold">
        {translate(title)}
        {pending && <PendingTag />}
      </h3>
      {children}
    </section>
  );
}

function Side({ k, v }: { k: string; v: string }) {
  const translate = useT();
  return (
    <div>
      <div className="text-xs text-muted">{translate(k)}</div>
      <div className="mt-0.5 break-words text-sm">{v}</div>
    </div>
  );
}

export default function AdminCasePage({ params }: { params: Promise<{ id: string }> }) {
  const {dateOnly, dateTime} = useLocalizedFormats();
  const translate = useT();
  const { id } = use(params);
  const router = useRouter();
  const { c, files, comments, reviews, jobs, history } = useCaseBundle(id);
  const profile = useApi<DoctorProfileDto>(c.data?.ownerRole === "DOCTOR" ? `/admin/doctors/${c.data.ownerId}/profile` : null);
  const [msgError, setMsgError] = useState<string | null>(null);
  const [msgBusy, setMsgBusy] = useState(false);
  const [dlError, setDlError] = useState<string | null>(null);

  if (c.loading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonBlock height={48} />
        <SkeletonBlock height={400} />
      </div>
    );
  }
  if (c.error || !c.data) return <LoadError error={c.error} what="case" onRetry={c.reload} backHref="/admin/cases" backLabel={translate("Back to cases")} />;
  const cs = c.data;

  async function messageSender() {
    setMsgBusy(true);
    setMsgError(null);
    try {
      const conv = await api<ConversationDto>("/chat/conversations", { method: "POST", body: { participantId: cs.ownerId } });
      router.push(`/admin/messages?c=${conv.id}`);
    } catch (e) {
      setMsgError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      setMsgBusy(false);
    }
  }

  async function download(fileId: string) {
    setDlError(null);
    try {
      const { downloadUrl } = await api<DownloadUrlDto>(`/cases/${id}/files/${fileId}/download-url`);
      window.open(downloadUrl, "_blank", "noopener");
    } catch {
      setDlError("We couldn't prepare that download. Try again.");
    }
  }

  const ownerRows: [string, string][] = [
    ["Name", cs.ownerName],
    ["Role", ROLE_LABEL[cs.ownerRole]],
  ];
  if (profile.data?.profileComplete) {
    const p = profile.data;
    ownerRows.push(
      ["Email", p.email],
      ["Clinic name", p.clinicName ?? ""],
      ["Contact number", p.contactNumber ?? ""],
      ["Address", [p.addressLine, [p.city, p.postcode].filter(Boolean).join(" "), p.state, p.country].filter(Boolean).join(", ")],
    );
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Link href="/admin/cases" className="flex min-h-9 items-center text-sm no-underline">
          {translate("← Cases")}</Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{cs.patientFullName}</h1>
            <Chip status={CASE_CHIP[cs.status]} />
          </div>
          <Button onClick={messageSender} loading={msgBusy}>
            {translate("Message sender")}</Button>
        </div>
        {msgError && (
          <div role="alert" className="text-sm text-red">
            {translate(msgError)}
          </div>
        )}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card title={translate("Records")}>
            {dlError && <div className="text-sm text-red">{dlError}</div>}
            {files.data?.length === 0 && <div className="text-muted">{translate("No files yet.")}</div>}
            {files.data?.map((f) => (
              <div key={f.id} className="flex items-center gap-3 border-t border-line pt-2.5">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-md bg-surface-2 text-xs text-muted">{translate("3D")}</div>
                <div className="min-w-0 flex-1">
                  <div className="break-all font-medium">{f.originalFilename}</div>
                  <div className="text-[13px] text-muted">
                    {fileSize(f.sizeBytes)} · {dateOnly(f.createdAt)}
                  </div>
                </div>
                <button onClick={() => download(f.id)} className="flex min-h-11 items-center text-sm text-accent">
                  {translate("Download")}</button>
              </div>
            ))}
          </Card>

          {SHOW_PENDING && (
            <>
              <Card title={translate("Treatment plan")} pending>
                <div className="text-sm text-muted">{translate("Treatment plans aren&apos;t stored yet.")}</div>
              </Card>
              <Card title={translate("Delivery")} pending>
                <div className="text-sm text-muted">{translate("Delivery details aren&apos;t stored yet. Aligners are shipped to the company address set in Integration settings.")}</div>
              </Card>
            </>
          )}

          <Card title={translate("Notes")}>
            {comments.data?.length === 0 && <div className="text-muted">{translate("No notes.")}</div>}
            {comments.data?.map((n) => (
              <div key={n.id} className="border-t border-line pt-2.5">
                <div className="text-[13px] text-muted">
                  {n.authorName} · {dateTime(n.createdAt)}
                </div>
                <div className="mt-0.5 whitespace-pre-wrap">{n.body}</div>
              </div>
            ))}
          </Card>

          <Card title={translate("Manufacturer feedback")}>
            {reviews.data?.length === 0 && <div className="text-muted">{translate("No feedback yet.")}</div>}
            {[...(reviews.data ?? [])].reverse().map((f) => (
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
            {jobs.data?.length === 0 && <div className="text-muted">{translate("Nothing has been sent yet.")}</div>}
            {[...(jobs.data ?? [])]
              .sort((a, b) => b.submissionVersion - a.submissionVersion)
              .map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 border-t border-line pt-2.5">
                  <span className="w-20 font-semibold">{translate("Version ")}{s.submissionVersion}</span>
                  <Chip status={JOB_CHIP[s.status]} />
                  <span className="text-[13px] text-muted">
                    {dateTime(s.createdAt)} · {s.attemptCount} {s.attemptCount === 1 ? translate("attempt") : translate("attempts")}
                  </span>
                  {s.lastError && <span className="w-full text-[13px] text-red">{s.lastError}</span>}
                </div>
              ))}
          </Card>

          <Card title={translate("History")}>
            {[...(history.data ?? [])].reverse().map((h) => (
              <div key={h.id} className="flex gap-3">
                <span className="mt-[5px] h-2.5 w-2.5 flex-none rounded-full bg-accent" />
                <div>
                  <div className="font-medium">{CASE_CHIP[h.toStatus] ? h.note || h.toStatus : h.toStatus}</div>
                  <div className="text-[13px] text-muted">{dateTime(h.createdAt)}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title={translate("Sent by")}>
            {ownerRows.map(([k, v]) => (
              <Side key={k} k={translate(k)} v={v} />
            ))}
          </Card>
          <Card title={translate("Patient account")}>
            <div className="flex flex-wrap items-center gap-2">
              <Chip label={cs.customerId ? translate("Linked") : translate("Not linked")} tone={cs.customerId ? "aqua" : "neutral"} />
            </div>
            {cs.customerName && (
              <div className="text-sm">
                {cs.customerName}
                <br />
                <span className="text-muted">{cs.customerEmail}</span>
              </div>
            )}
          </Card>
          <Card title={translate("Payment")}>
            <div className="text-muted">{translate(PAYMENT_LABEL[cs.paymentStatus])}</div>
            {SHOW_PENDING && (
              <>
                <div className="mt-1.5 text-xs text-muted">
                  {translate("Tracking number ")}<PendingTag />
                </div>
                <div className="text-sm text-muted">{translate("Not assigned yet")}</div>
              </>
            )}
            <div className="mt-1.5 text-xs text-muted">{translate("Created")}</div>
            <div className="text-sm">{dateOnly(cs.createdAt)}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
