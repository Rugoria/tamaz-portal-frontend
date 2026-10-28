"use client";

import { useState } from "react";
import { mutate as globalMutate } from "swr";
import { useT } from "@/i18n/client";
import { useLocalizedFormats } from "@/i18n/formats";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { pollMs, useRealtimeLive } from "@/lib/realtime";
import type { ApplicantDto, Page } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Field";
import { FilterChips } from "@/components/ui/Tabs";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";
import { useToast } from "@/components/ui/Toast";

type View = "PENDING" | "REJECTED";

/** Doctors and clinics that signed up (and confirmed their email): the admin approves them, or rejects them with an optional reason. */
export default function ApprovalsPage() {
  const translate = useT();
  const { relative } = useLocalizedFormats();
  const toast = useToast();
  const streaming = useRealtimeLive();
  const [view, setView] = useState<View>("PENDING");
  const list = useApi<Page<ApplicantDto>>(`/admin/approvals?status=${view}&size=50`, { refreshInterval: pollMs(30000, streaming) });
  const [rejecting, setRejecting] = useState<ApplicantDto | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(a: ApplicantDto, action: "approve" | "reject") {
    setBusyId(a.id);
    setError(null);
    try {
      await api(`/admin/approvals/${a.id}/${action}`, { method: "POST", body: action === "reject" ? { reason: reason.trim() } : undefined });
      toast(translate(action === "approve" ? "Account approved." : "Application rejected."));
      setRejecting(null);
      setReason("");
      await Promise.all([list.reload(), globalMutate("/admin/approvals/count")]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  const rows = list.data?.content ?? [];
  return (
    <div className="flex w-full flex-col gap-5">
      <div>
        <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("Approvals")}</h1>
        <p className="mb-0 mt-1 text-muted">{translate("Doctors and clinics that signed up and confirmed their email wait here until you decide.")}</p>
      </div>
      <FilterChips
        options={[{ key: "PENDING" as View, label: "Waiting" }, { key: "REJECTED" as View, label: "Rejected" }]}
        active={view}
        onChange={setView}
      />
      {error && (
        <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-4 py-3 text-sm text-red">
          {translate(error)}
        </div>
      )}
      {list.error && <ErrorState title={translate("We couldn't load the applications.")} onRetry={list.reload} />}
      {list.loading && !list.data && <SkeletonRows rows={4} />}
      {!list.loading && !list.error && rows.length === 0 && (
        <EmptyState title={translate(view === "PENDING" ? "No one is waiting for approval." : "No rejected applications.")} />
      )}
      <div className="flex flex-col gap-3">
        {rows.map((a) => (
          <div key={a.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[17px] font-semibold">{a.role === "CLINIC" ? a.fullName : a.clinicName ? `${a.fullName} · ${a.clinicName}` : a.fullName}</span>
                <Chip label={a.role === "CLINIC" ? "Clinic" : "Doctor"} tone={a.role === "CLINIC" ? "aqua" : "blue"} />
                {a.status === "REJECTED" && <Chip label="Rejected" tone="red" />}
              </div>
              <div className="mt-1 break-all text-sm text-muted">{a.email}</div>
              <div className="mt-1 text-sm">
                {[a.contactNumber, [a.addressLine, a.city, a.postcode, a.state, a.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
              </div>
              <div className="mt-1 text-[13px] text-muted">
                {translate("Signed up")} {relative(a.appliedAt)}
                {a.status === "REJECTED" && a.reason ? ` · ${translate("Reason")}: ${a.reason}` : ""}
              </div>
            </div>
            {a.status === "PENDING" && (
              <div className="flex shrink-0 gap-2">
                <Button variant="ghost" onClick={() => { setRejecting(a); setReason(""); setError(null); }} disabled={busyId === a.id}>
                  {translate("Reject")}</Button>
                <Button variant="primary" onClick={() => void decide(a, "approve")} loading={busyId === a.id} className="px-5">
                  {translate("Approve")}</Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {rejecting && (
        <Dialog title={translate("Reject this application?")} onClose={() => setRejecting(null)}>
          <p className="m-0 text-sm text-muted">{translate("{name} will be told by email. You can add a reason; it is included in the email.", { name: rejecting.fullName })}</p>
          <Textarea rows={4} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={translate("Reason (optional)")} aria-label={translate("Reason (optional)")} />
          <DialogActions>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              {translate("Cancel")}</Button>
            <Button variant="primary" onClick={() => void decide(rejecting, "reject")} loading={busyId === rejecting.id} className="px-5">
              {translate("Reject")}</Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}
