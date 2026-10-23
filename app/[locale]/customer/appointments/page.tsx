"use client";
import {useLocalizedFormats} from "@/i18n/formats";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import {hhmm, timeRange} from "@/lib/dates";
import { useApi } from "@/lib/hooks";
import type { BookingDto, Page } from "@/lib/types";
import { Button, buttonClass } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";

type Scope = "upcoming" | "past";

export default function MyAppointmentsPage() {
  const {shortDate} = useLocalizedFormats();
  const translate = useT();
  const toast = useToast();
  const [scope, setScope] = useState<Scope>("upcoming");
  const [page, setPage] = useState(0);
  const { data, error, loading, reload } = useApi<Page<BookingDto>>(`/appointments/my?scope=${scope}&page=${page}&size=10`);
  const [cancelling, setCancelling] = useState<BookingDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function cancel() {
    if (!cancelling) return;
    setBusy(true);
    setFailure(null);
    try {
      await api(`/appointments/bookings/${cancelling.id}/cancel`, { method: "POST" });
      setCancelling(null);
      toast(translate("Appointment cancelled."));
      await reload();
    } catch (e) {
      setFailure(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const items = data?.content ?? [];

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("My appointments")}</h1>
        <Link href="/customer/appointments/book" className={buttonClass("primary", "md", "no-underline")}>
          {translate("Book appointment")}</Link>
      </div>
      <Tabs
        tabs={[
          { key: "upcoming", label: "Upcoming" },
          { key: "past", label: "Past" },
        ]}
        active={scope}
        onChange={(s) => (setScope(s), setPage(0))}
      />

      {scope === "upcoming" && <div className="text-sm text-muted">{translate("You can cancel or move an appointment up to 24 hours before it starts. After that, message the clinic.")}</div>}
      {error && <ErrorState title={translate("We couldn't load your appointments.")} onRetry={reload} />}
      {loading && <SkeletonRows rows={3} />}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          title={scope === "upcoming" ? translate("No upcoming appointments.") : translate("No past appointments.")}
          text={scope === "upcoming" ? translate("Book a time at one of our clinics.") : translate("Finished and cancelled appointments will show here.")}
        >
          {scope === "upcoming" && (
            <Link href="/customer/appointments/book" className={buttonClass("primary", "md", "no-underline")}>
              {translate("Book appointment")}</Link>
          )}
        </EmptyState>
      )}

      {!loading && !error && items.length > 0 && data && (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {items.map((b) => {
            const start = new Date(b.startsAt);
            return (
              <div key={b.id} className="flex flex-col gap-3 border-b border-line px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
                <div className="flex flex-col gap-1">
                  <div className="font-semibold">{b.clinicName}</div>
                  <div className="text-sm text-muted">
                    {shortDate(start)}, {timeRange(b.startsAt, b.endsAt)}
                  </div>
                  {b.status === "CANCELLED_BY_CLINIC" && <div className="text-sm text-red">{translate("The clinic cancelled this appointment.")}</div>}
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {b.status === "CANCELLED_BY_PATIENT" && <Chip label={translate("You cancelled")} tone="neutral" />}
                  {b.status === "CANCELLED_BY_CLINIC" && <Chip label={translate("Cancelled by clinic")} tone="red" />}
                  {b.status === "BOOKED" && scope === "past" && <Chip label={translate("Past")} tone="quiet" />}
                  {scope === "upcoming" && b.status === "BOOKED" && new Date(b.patientCanChangeUntil) > new Date() && (
                    <>
                      <Link href={`/customer/appointments/book?reschedule=${b.id}`} className={buttonClass("secondary", "md", "no-underline")}>
                        {translate("Reschedule")}</Link>
                      <Button variant="danger" onClick={() => (setFailure(null), setCancelling(b))}>
                        {translate("Cancel")}</Button>
                    </>
                  )}
                  {scope === "upcoming" && b.status === "BOOKED" && new Date(b.patientCanChangeUntil) <= new Date() && (
                    <div className="max-w-[320px] text-sm text-muted md:text-end">
                      {translate("Too late to cancel or move online (the limit is 24 hours before). Please")}{" "}
                      <Link href={`/customer/clinics`}>{translate("message the clinic")}</Link>.
                    </div>
                  )}
                  {scope === "past" && b.status === "CANCELLED_BY_CLINIC" && (
                    <Link href={`/customer/appointments/book?clinic=${b.clinicId}`} className={buttonClass("secondary", "md", "no-underline")}>
                      {translate("Book another time")}</Link>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between px-6 py-3.5 text-sm text-muted">
            <span>
              {translate("Showing ")}{data.number * data.size + 1} {translate(" to ")}{data.number * data.size + items.length} {translate(" of ")}{data.totalElements}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage((n) => n - 1)} disabled={data.first} className="h-9 rounded-lg border border-line bg-surface px-3.5 text-muted disabled:cursor-not-allowed enabled:text-ink">
                {translate("Previous")}</button>
              <button onClick={() => setPage((n) => n + 1)} disabled={data.last} className="h-9 rounded-lg border border-line bg-surface px-3.5 text-muted disabled:cursor-not-allowed enabled:text-ink">
                {translate("Next")}</button>
            </div>
          </div>
        </div>
      )}

      {cancelling && (
        <Dialog title={translate("Cancel this appointment?")} onClose={() => setCancelling(null)}>
          <p className="m-0 text-sm text-muted">
            {cancelling.clinicName}, {shortDate(new Date(cancelling.startsAt))} {translate(" at ")}{hhmm(cancelling.startsAt)}{translate(". The clinic will be told, and the time becomes available to others.")}</p>
          {failure && (
            <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">
              {translate(failure)}
            </div>
          )}
          <DialogActions>
            <Button variant="ghost" onClick={() => setCancelling(null)}>
              {translate("Keep it")}</Button>
            <Button variant="danger" onClick={cancel} loading={busy}>
              {translate("Cancel appointment")}</Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}
