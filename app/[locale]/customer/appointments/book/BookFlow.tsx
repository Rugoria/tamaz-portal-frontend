"use client";
import {useLocalizedFormats} from "@/i18n/formats";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import {addMonths, hhmm, localTimeZone, sameDay, startOfDay, startOfMonth, timeRange} from "@/lib/dates";
import { useApi } from "@/lib/hooks";
import type { BookingDto, ClinicSummary, ConversationDto, OpenSlotDto, Page } from "@/lib/types";
import { MonthCalendar } from "@/components/pending/MonthCalendar";
import { Button, buttonClass } from "@/components/ui/Button";
import { ErrorState, SkeletonBlock } from "@/components/ui/states";

type Step = "pick" | "review" | "done";

export function BookFlow({ clinicParam, rescheduleId }: { clinicParam: string | null; rescheduleId: string | null }) {
  const {longDate, shortDate} = useLocalizedFormats();
  const translate = useT();
  const router = useRouter();

  const clinics = useApi<ClinicSummary[]>("/clinics");
  const upcoming = useApi<Page<BookingDto>>(rescheduleId ? "/appointments/my?size=100" : null);
  const moving = upcoming.data?.content.find((b) => b.id === rescheduleId) ?? null;

  const [clinicChoice, setClinicChoice] = useState(clinicParam ?? "");
  const clinicId = moving?.clinicId ?? (clinicChoice || clinics.data?.[0]?.id || "");
  const clinic = clinics.data?.find((c) => c.id === clinicId);

  const today = useMemo(() => startOfDay(new Date()), []);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [day, setDay] = useState<Date | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("pick");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [msgBusy, setMsgBusy] = useState(false);

  // Open times for the month on screen. The server answers in universal time; the calendar groups them by the viewer's own day.
  const from = month < today ? today : month;
  const to = addMonths(month, 1);
  const open = useApi<OpenSlotDto[]>(clinicId && to > from ? `/appointments/clinics/${clinicId}/open-slots?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}` : null);

  const slots = useMemo(() => open.data ?? [], [open.data]);
  const dayHasOpen = (d: Date) => slots.some((s) => sameDay(new Date(s.startsAt), d));
  const timesOfDay = day ? slots.filter((s) => sameDay(new Date(s.startsAt), day)) : [];
  const chosen = slots.find((s) => s.id === slotId) ?? null;
  const monthEmpty = !open.loading && !open.error && slots.length === 0;

  async function confirm() {
    if (!chosen) return;
    setBusy(true);
    setProblem(null);
    try {
      if (moving) await api(`/appointments/bookings/${moving.id}/reschedule`, { method: "POST", body: { slotId: chosen.id } });
      else await api("/appointments/bookings", { method: "POST", body: { slotId: chosen.id } });
      setStep("done");
    } catch (e) {
      // Someone else booked it a moment earlier: go back to the times and show what is still open.
      setProblem(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      setSlotId(null);
      setStep("pick");
      await open.reload();
    } finally {
      setBusy(false);
    }
  }

  async function messageClinic() {
    setMsgBusy(true);
    try {
      const c = await api<ConversationDto>("/chat/conversations", { method: "POST", body: { participantId: clinicId } });
      router.push(`/customer/messages?c=${c.id}`);
    } catch {
      setMsgBusy(false);
    }
  }

  if (moving && new Date(moving.patientCanChangeUntil) <= new Date()) {
    return (
      <div className="mx-auto mt-6 flex w-full max-w-[560px] flex-col gap-4 rounded-xl border border-line bg-surface px-8 py-10 text-center">
        <h1 className="m-0 text-2xl font-semibold">{translate("It&apos;s too late to move this online")}</h1>
        <p className="m-0 text-muted">{translate("An appointment can be moved up to 24 hours before it starts. Please message the clinic.")}</p>
        <div className="flex justify-center gap-3">
          <Button onClick={messageClinic} loading={msgBusy}>
            {translate("Message clinic")}</Button>
          <Link href="/customer/appointments" className={buttonClass("secondary", "md", "no-underline")}>
            {translate("Back")}</Link>
        </div>
      </div>
    );
  }

  if (step === "done" && chosen) {
    return (
      <div className="mx-auto mt-6 flex w-full max-w-[560px] flex-col items-center gap-4 rounded-xl border border-line bg-surface px-8 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-soft text-green">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M5 12l5 5 9-10" />
          </svg>
        </div>
        <h1 className="m-0 text-2xl font-semibold">{moving ? translate("Your appointment was moved") : translate("You're booked")}</h1>
        <div className="text-muted">
          {clinic?.name ?? moving?.clinicName}
          <br />
          {shortDate(new Date(chosen.startsAt))}, {timeRange(chosen.startsAt, chosen.endsAt)}
        </div>
        <Link href="/customer/appointments" className={buttonClass("primary", "lg", "no-underline")}>
          {translate("View my appointments")}</Link>
      </div>
    );
  }

  if (step === "review" && chosen) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5">
        <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{moving ? translate("Review the new time") : translate("Review your booking")}</h1>
        <div className="rounded-xl border border-line bg-surface px-6 py-2">
          {[
            ["Clinic", clinic?.name ?? moving?.clinicName ?? ""],
            ["Date", `${longDate(new Date(chosen.startsAt))} ${new Date(chosen.startsAt).getFullYear()}`],
            ["Time", timeRange(chosen.startsAt, chosen.endsAt)],
            ["Time zone", localTimeZone()],
          ].map(([k, v], i) => (
            <div key={k} className={`flex justify-between gap-4 py-3.5 ${i ? "border-t border-line" : ""}`}>
              <span className="text-muted">{translate(k)}</span>
              <span className="text-end font-medium">{v}</span>
            </div>
          ))}
        </div>
        {moving && <div className="text-sm text-muted">{translate("This replaces your appointment on ")}{shortDate(new Date(moving.startsAt))}, {hhmm(moving.startsAt)}.</div>}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep("pick")}>
            {translate("Back")}</Button>
          <Button variant="primary" size="lg" onClick={confirm} loading={busy} className="px-6">
            {moving ? translate("Confirm new time") : translate("Confirm booking")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5">
      <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{moving ? translate("Move your appointment") : translate("Book an appointment")}</h1>
      {moving && (
        <div className="rounded-lg border border-line bg-surface px-4 py-3 text-sm">
          {translate("Now: ")}{shortDate(new Date(moving.startsAt))}, {timeRange(moving.startsAt, moving.endsAt)} {translate(" at ")}{moving.clinicName}{translate(". Pick a new time.")}</div>
      )}
      {problem && (
        <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-4 py-3 font-medium text-red">
          {translate(problem)}
        </div>
      )}
      {clinics.error && <ErrorState title={translate("We couldn't load the clinics.")} onRetry={clinics.reload} />}

      <div className="grid items-start gap-5 md:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {translate("Clinic")}<select
              value={clinicId}
              disabled={!!moving}
              onChange={(e) => {
                setClinicChoice(e.target.value);
                setDay(null);
                setSlotId(null);
              }}
              className="h-11 rounded-lg border border-line bg-surface px-3 text-[15px] font-normal disabled:bg-bg disabled:text-muted"
            >
              {moving && <option value={moving.clinicId}>{moving.clinicName}</option>}
              {!moving &&
                clinics.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <MonthCalendar
            month={month}
            onMonth={(m) => {
              setMonth(m);
              setDay(null);
              setSlotId(null);
            }}
            selected={day}
            onSelect={(d) => {
              setDay(d);
              setSlotId(null);
            }}
            hasOpen={dayHasOpen}
            minDate={today}
          />
          <div className="text-xs text-muted">{translate("Times are shown in your time zone (")}{localTimeZone()}).</div>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
          {open.error ? (
            <ErrorState title={translate("We couldn't load the open times.")} onRetry={open.reload} />
          ) : open.loading ? (
            <SkeletonBlock height={120} />
          ) : monthEmpty && !day ? (
            <div className="rounded-lg bg-surface-2 p-8 text-center">
              <div className="font-semibold">{clinic?.name ?? "This clinic"} {translate(" has no open times this month.")}</div>
              <div className="mt-1 text-sm text-muted">{translate("Try another month, pick another clinic, or send them a message.")}</div>
              <Button onClick={messageClinic} loading={msgBusy} className="mt-4">
                {translate("Message clinic")}</Button>
            </div>
          ) : !day ? (
            <div>
              <div className="font-semibold">{translate("Open times")}</div>
              <div className="mt-1.5 text-muted">{translate("Pick a day to see open times.")}</div>
            </div>
          ) : (
            <>
              <div>
                <div className="font-semibold">{translate("Open times")}</div>
                <div className="mt-1 text-sm text-muted">{longDate(day)}</div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {timesOfDay.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSlotId(t.id)}
                    aria-pressed={slotId === t.id}
                    title={timeRange(t.startsAt, t.endsAt)}
                    className={`h-11 rounded-lg border text-[15px] ${slotId === t.id ? "border-accent bg-accent-soft font-semibold text-accent-deep" : "border-line bg-surface hover:bg-bg"}`}
                  >
                    {hhmm(t.startsAt)}
                  </button>
                ))}
              </div>
              {chosen && <div className="text-sm text-muted">{timeRange(chosen.startsAt, chosen.endsAt)}</div>}
              <Button variant="primary" size="lg" disabled={!chosen} onClick={() => setStep("review")}>
                {moving ? translate("Review new time") : translate("Review booking")}
              </Button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
