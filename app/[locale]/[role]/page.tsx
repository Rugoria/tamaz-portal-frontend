"use client";
import {useLocalizedFormats} from "@/i18n/formats";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import { use, useMemo } from "react";
import { useApi } from "@/lib/hooks";

import { CASE_CHIP } from "@/lib/status";
import {addDays, hhmm, startOfDay} from "@/lib/dates";
import type { BookingDto, CaseDto, CaseStatus, NotificationDto, Page } from "@/lib/types";
import { buttonClass } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ErrorState, SkeletonBlock } from "@/components/ui/states";

/** What the home screen tells a clinic or doctor to do for each case that needs them. */
const ATTENTION: Partial<Record<CaseStatus, { note: string; action: string }>> = {
  DESIGN_REJECTED: { note: "Read Tamaz's comments and upload a corrected scan.", action: "Fix design" },
  FAILED: { note: "We couldn't deliver this case. Try sending again.", action: "Try sending again" },
};

export default function StaffHome({ params }: { params: Promise<{ role: string }> }) {
  const {relative} = useLocalizedFormats();
  const translate = useT();
  const { role } = use(params);
  const base = `/${role}`;
  // Only the two short lists the screen shows, fetched by status instead of loading every case.
  const needs = useApi<Page<CaseDto>>("/cases?status=DESIGN_REJECTED,FAILED&size=20");
  const draftsPage = useApi<Page<CaseDto>>("/cases?status=DRAFT,READY_FOR_SUBMISSION&size=20");
  const notes = useApi<Page<NotificationDto>>("/notifications?size=3");

  const attention = needs.data?.content ?? [];
  const drafts = draftsPage.data?.content ?? [];
  const cases = { error: needs.error || draftsPage.error, loading: needs.loading || draftsPage.loading, reload: () => Promise.all([needs.reload(), draftsPage.reload()]) };

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("Home")}</h1>

      {cases.error ? (
        <ErrorState title={translate("We couldn't load your cases.")} onRetry={() => cases.reload()} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
              <h2 className="m-0 text-lg font-semibold">{translate("Needs your attention")}</h2>
              {cases.loading && <SkeletonBlock height={120} />}
              {!cases.loading && attention.length === 0 && (
                <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">{translate("Nothing needs your attention.")}</div>
              )}
              {attention.map((c) => (
                <Link
                  key={c.id}
                  href={`${base}/cases/${c.id}`}
                  className="flex flex-col justify-between gap-3.5 rounded-xl border border-line bg-surface px-5 py-[18px] text-ink no-underline hover:border-accent hover:text-ink sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-semibold">{c.patientFullName}</span>
                      <span className="text-sm text-muted">{translate("Case ")}{c.caseNumber}</span>
                      <Chip status={CASE_CHIP[c.status]} />
                    </div>
                    <div className="text-sm text-muted">{ATTENTION[c.status]?.note && translate(ATTENTION[c.status]!.note)}</div>
                  </div>
                  <span className={buttonClass("secondary", "md", "pointer-events-none")}>{ATTENTION[c.status]?.action && translate(ATTENTION[c.status]!.action)}</span>
                </Link>
              ))}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="m-0 text-lg font-semibold">{translate("Drafts and ready to send")}</h2>
              <div className="overflow-hidden rounded-xl border border-line bg-surface">
                {!cases.loading && drafts.length === 0 && <div className="px-5 py-6 text-center text-muted">{translate("No drafts.")}</div>}
                {drafts.map((c) => (
                  <Link
                    key={c.id}
                    href={`${base}/cases/${c.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5 text-ink no-underline last:border-b-0 hover:bg-bg hover:text-ink"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-semibold">{c.patientFullName}</span>
                      <span className="text-sm text-muted">{translate("Case ")}{c.caseNumber}</span>
                      <Chip status={CASE_CHIP[c.status]} />
                    </div>
                    <span className="flex min-h-11 items-center px-1.5 font-medium text-accent">{c.status === "DRAFT" ? translate("Continue") : translate("Send to Tamaz")}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-6">
            {role === "clinic" && <NoSlotsNote />}
            {role === "clinic" && <TodaysAppointments />}
            <section className="flex flex-col gap-3">
              <h2 className="m-0 text-lg font-semibold">{translate("Latest notifications")}</h2>
              <div className="overflow-hidden rounded-xl border border-line bg-surface">
                {notes.loading && <div className="tz-pulse px-5 py-6 text-sm text-muted">{translate("Loading")}</div>}
                {!notes.loading && (notes.data?.content.length ?? 0) === 0 && <div className="px-5 py-6 text-center text-muted">{translate("No notifications yet.")}</div>}
                {notes.data?.content.map((n) => (
                  <Link key={n.id} href={`${base}/notifications`} className="flex gap-3 border-b border-line px-5 py-3.5 text-ink no-underline hover:text-ink">
                    <span className="mt-1.5 h-2 w-2 flex-none rounded-full" style={{ background: n.readAt ? "transparent" : "var(--accent)" }} />
                    <div>
                      <div className={`text-sm ${n.readAt ? "" : "font-semibold"}`}>{n.subject}</div>
                      <div className="mt-0.5 text-[13px] text-muted">{relative(n.createdAt)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

/** Slots never appear on their own: if the clinic has none in the next two months, patients have nothing to book. */
function NoSlotsNote() {
  const translate = useT();
  const { from, to } = useMemo(() => {
    const now = new Date();
    return { from: now.toISOString(), to: addDays(startOfDay(now), 60).toISOString() };
  }, []);
  const { data, loading, error } = useApi<unknown[]>(`/appointments/slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  if (loading || error || (data?.length ?? 0) > 0) return null;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface px-5 py-4">
      <div className="font-semibold">{translate("Patients can&apos;t book you yet")}</div>
      <div className="text-sm text-muted">{translate("You have no appointment slots in the next two months. Patients only see times you add.")}</div>
      <Link href="/clinic/appointments" className={buttonClass("primary", "md", "no-underline self-start")}>
        {translate("Add slots")}</Link>
    </div>
  );
}

/** The clinic's bookings for today, in the clinic's own time. */
function TodaysAppointments() {
  const translate = useT();
  const { from, to } = useMemo(() => {
    const start = startOfDay(new Date());
    return { from: start.toISOString(), to: addDays(start, 1).toISOString() };
  }, []);
  const { data, error, loading } = useApi<Page<BookingDto>>(`/appointments/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&size=20&sort=slot.startsAt,asc`);
  const items = data?.content ?? [];
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 text-lg font-semibold">{translate("Today&apos;s appointments")}</h2>
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {loading && <div className="tz-pulse px-5 py-6 text-sm text-muted">{translate("Loading")}</div>}
        {error && <div className="px-5 py-6 text-center text-sm text-red">{translate("We couldn&apos;t load today&apos;s appointments.")}</div>}
        {!loading && !error && items.length === 0 && <div className="px-5 py-6 text-center text-muted">{translate("No appointments today.")}</div>}
        {items.map((b) => (
          <Link key={b.id} href="/clinic/appointments" className="flex gap-4 border-b border-line px-5 py-3.5 text-ink no-underline last:border-b-0 hover:bg-bg hover:text-ink">
            <span className="w-12 font-semibold">{hhmm(b.startsAt)}</span>
            <span>{b.patientName}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
