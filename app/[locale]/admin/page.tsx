"use client";
import {useLocalizedFormats} from "@/i18n/formats";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import { useApi } from "@/lib/hooks";

import { JOB_CHIP, ROLE_LABEL } from "@/lib/status";
import type { AdminTransferJobDto, ConversationDto, Page } from "@/lib/types";
import { Chip, RolePill } from "@/components/ui/Chip";
import { DataTable } from "@/components/ui/Table";
import { buttonClass } from "@/components/ui/Button";
import { ErrorState, SkeletonRows } from "@/components/ui/states";
import { MetricsSection } from "@/components/admin/MetricsSection";
import { SHOW_PENDING } from "@/lib/pending";

export default function AdminOverview() {
  const {relative} = useLocalizedFormats();
  const translate = useT();
  const failed = useApi<Page<AdminTransferJobDto>>("/admin/transfer-jobs?status=FAILED&size=5");
  const latest = useApi<Page<AdminTransferJobDto>>("/admin/transfer-jobs?size=10");
  const convos = useApi<Page<ConversationDto>>("/chat/conversations?size=50");

  const error = failed.error || latest.error;
  const unread = (convos.data?.content ?? []).filter((c) => c.unreadCount > 0);
  const failedRows = failed.data?.content ?? [];

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("Overview")}</h1>
      {/* Metrics are built from the design but the client has not confirmed them (§9 #18): hidden when NEXT_PUBLIC_SHOW_PENDING=false. */}
      {SHOW_PENDING && <MetricsSection />}

      {error ? (
        <ErrorState
          title={translate("We couldn't load the overview.")}
          onRetry={() => {
            failed.reload();
            latest.reload();
          }}
        />
      ) : (
        <>
          <section id="attention" className="flex flex-col gap-4 rounded-xl bg-deep px-5 py-6 text-deep-ink md:px-7">
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-xs font-semibold uppercase tracking-[.8px] text-deep-aqua">{translate("Needs attention")}</h2>
              <span className="text-sm text-deep-muted">{failed.loading ? "" : translate("{v0} failed deliveries", {v0: failed.data?.totalElements ?? 0})}</span>
            </div>
            {!failed.loading && failedRows.length === 0 && (
              <div className="rounded-lg border border-deep-line bg-deep-2 p-5 text-deep-muted">{translate("No failed deliveries.")}</div>
            )}
            {failedRows.map((f) => (
              <div key={f.id} className="grid items-center gap-3 rounded-lg border border-deep-line bg-deep-2 px-5 py-4 md:grid-cols-[1.2fr_1.4fr_2fr_auto] md:gap-4">
                <div>
                  <div className="font-semibold">{f.patientFullName}</div>
                  <div className="text-[13px] text-deep-muted">
                    {translate("Version ")}{f.submissionVersion}, {f.attemptCount} {f.attemptCount === 1 ? translate("attempt") : translate("attempts")}
                  </div>
                </div>
                <div className="text-sm">
                  {f.ownerName} ({translate(ROLE_LABEL[f.ownerRole])})
                </div>
                <div className="text-sm text-[#F5B8B3]">{f.lastError || translate("No error recorded.")}</div>
                <Link href={`/admin/cases/${f.caseId}`} className="flex h-11 items-center justify-center rounded-lg border border-deep-line px-5 font-medium text-deep-ink no-underline hover:text-deep-ink">
                  {translate("View")}</Link>
              </div>
            ))}
          </section>

          <div className="grid items-start gap-6 xl:grid-cols-[1fr_320px]">
            <section className="flex min-w-0 flex-col gap-3">
              <h2 className="m-0 text-lg font-semibold">{translate("Latest submissions")}</h2>
              {latest.loading ? (
                <SkeletonRows rows={6} />
              ) : (
                <DataTable
                  columns={[
                    { header: "Patient", render: (r) => <Link href={`/admin/cases/${r.caseId}`} className="font-semibold text-ink no-underline">{r.patientFullName}</Link> },
                    {
                      header: "Sent by",
                      render: (r) => (
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-medium">{r.ownerName}</span>
                          <RolePill label={translate(ROLE_LABEL[r.ownerRole])} />
                        </div>
                      ),
                    },
                    { header: "Version", render: (r) => `V${r.submissionVersion}` },
                    { header: "Delivery", render: (r) => <Chip status={JOB_CHIP[r.status]} /> },
                    { header: "Sent", render: (r) => <span className="text-muted">{relative(r.createdAt)}</span> },
                  ]}
                  rows={latest.data?.content ?? []}
                  rowKey={(r) => r.id}
                  rowBg={(r) => (r.status === "FAILED" ? "#FDF3F2" : undefined)}
                  grid="1.2fr 1.6fr .6fr 1fr 1fr"
                  footer={translate("Showing {from} to {to} of {total}", {from: 1, to: latest.data?.content.length ?? 0, total: latest.data?.totalElements ?? 0})}
                />
              )}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="m-0 text-lg font-semibold">{translate("Unread messages")}</h2>
              <div className="overflow-hidden rounded-xl border border-line bg-surface">
                {unread.length === 0 && <div className="px-5 py-6 text-center text-muted">{convos.loading ? translate("Loading") : translate("No unread messages.")}</div>}
                {unread.map((u) => (
                  <Link key={u.id} href={`/admin/messages?c=${u.id}`} className="flex items-center justify-between border-b border-line px-5 py-3.5 text-ink no-underline hover:text-ink">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium">{u.otherPartyName ?? "Unknown"}</span>
                      {u.otherPartyRole && <RolePill label={translate(ROLE_LABEL[u.otherPartyRole])} />}
                    </div>
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-white">{u.unreadCount}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
      <Link href="/admin/submissions" className={buttonClass("link", "md", "self-start no-underline")}>
        {translate("See all submissions")}</Link>
    </div>
  );
}
