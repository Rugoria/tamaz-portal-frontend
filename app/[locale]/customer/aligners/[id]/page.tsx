"use client";
import {useLocalizedFormats} from "@/i18n/formats";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import { use, useState } from "react";
import { useApi } from "@/lib/hooks";

import { CASE_CHIP, PATIENT_EXPLAIN } from "@/lib/status";
import { SHOW_PENDING } from "@/lib/pending";
import type { CaseDto } from "@/lib/types";
import { JourneyPanel } from "@/components/features/JourneyPanel";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { LoadError, PendingTag, PreviewNote, SkeletonBlock } from "@/components/ui/states";

export default function CaseProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const {relative, dateOnly} = useLocalizedFormats();
  const translate = useT();
  const { id } = use(params);
  const { data: c, error, loading, reload } = useApi<CaseDto>(`/cases/${id}`);
  const [payNote, setPayNote] = useState(false);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5">
        <SkeletonBlock height={32} />
        <SkeletonBlock height={200} />
        <SkeletonBlock height={220} />
      </div>
    );
  }
  if (error || !c) {
    return (
      <div className="mx-auto w-full max-w-[1120px]">
        <LoadError error={error} what="case" onRetry={reload} backHref="/customer/aligners" backLabel={translate("Back to my aligners")} />
      </div>
    );
  }

  const showPay = SHOW_PENDING && (c.paymentStatus === "DUE" || c.paymentStatus === "PAID");
  const pause =
    c.status === "DESIGN_REJECTED" ? "Paused while your clinic updates the design." : c.status === "FAILED" ? "Paused while the team looks into the delay." : undefined;

  const rows: [string, string][] = [
    ["Patient", c.patientFullName],
    ["Treated by", c.ownerName],
    ["Started", dateOnly(c.createdAt)],
    ["Last updated", relative(c.updatedAt)],
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link href="/customer/aligners" className="flex min-h-11 items-center text-sm no-underline">
          {translate("← My aligners")}</Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("Your aligners")}</h1>
          <Chip status={CASE_CHIP[c.status]} />
          {c.paymentStatus === "DUE" && <Chip label={translate("Payment due")} tone="amber" />}
          {c.paymentStatus === "PAID" && <Chip label={translate("Paid")} tone="aqua" />}
        </div>
      </div>

      <JourneyPanel status={c.status} eyebrow={translate("Your case")} pauseText={pause} large />

      <div className={`grid items-start gap-5 ${showPay ? "md:grid-cols-[1fr_380px]" : ""}`}>
        <section className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-6 md:order-1">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.8px] text-aqua">{translate("What is happening")}</div>
            <div className="mt-1.5 text-lg font-semibold">{translate(PATIENT_EXPLAIN[c.status])}</div>
          </div>
          <dl className="m-0 flex flex-col">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-t border-line py-3 text-[15px]">
                <dt className="text-muted">{translate(k)}</dt>
                <dd className="m-0 text-end font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {showPay && c.paymentStatus === "DUE" && (
          <section className="order-first flex flex-col gap-4 rounded-xl border border-amber-line bg-amber-soft p-6 md:order-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[.8px] text-amber">
                {translate("Payment due ")}<PendingTag />
              </div>
              <div className="mt-1.5 text-lg font-semibold">{translate("Pay to start making your aligners")}</div>
              <div className="mt-1.5 text-sm text-[#3D3A33]">{translate("Your design is approved, so your payment is now due.")}</div>
            </div>
            <div className="rounded-lg border border-dashed border-[#C9A94F] p-4 text-center text-sm text-pending-ink">{translate("Amount to be confirmed")}</div>
            <Button variant="primary" size="lg" onClick={() => setPayNote(true)}>
              {translate("Pay now")}</Button>
            {payNote && <PreviewNote>{translate("Payments aren&apos;t set up yet. The provider, prices and when production starts are still to be decided.")}</PreviewNote>}
          </section>
        )}

        {showPay && c.paymentStatus === "PAID" && (
          <section className="order-first flex flex-col gap-4 rounded-xl border border-[#A9DCE9] bg-aqua-soft p-6 md:order-2">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-aqua text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <path d="M5 12l5 5 9-10" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[.8px] text-aqua-deep">
                  {translate("Paid ")}<PendingTag />
                </div>
                <div className="mt-0.5 text-lg font-semibold">{translate("Payment received")}</div>
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-[#7FBFD1] p-3.5 text-center text-sm text-aqua-deep">{translate("Receipt")}</div>
          </section>
        )}
      </div>
    </div>
  );
}
