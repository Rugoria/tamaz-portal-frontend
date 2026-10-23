"use client";
import {useLocalizedFormats} from "@/i18n/formats";

import {useT} from "@/i18n/client";

import { useRouter } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { use, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import {addDays, addMonths, hhmm, localDateTime, localTimeZone, mondayOf, monthCells, sameDay, startOfDay, startOfMonth, timeRange, toDateInput} from "@/lib/dates";
import { useApi } from "@/lib/hooks";
import type { BookingDto, ConversationDto, Page, SlotDto } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/ui/states";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";

type Dialog = null | "add" | { edit: SlotDto } | { removeMany: SlotDto[] };

export default function ClinicAppointmentsPage({ params }: { params: Promise<{ role: string }> }) {
  const {DOW, MONTH_NAMES, longDate} = useLocalizedFormats();
  const translate = useT();
  const { role } = use(params);
  // Only clinics take appointments; an independent doctor has no such page.
  if (role !== "clinic") notFound();

  const toast = useToast();
  const [tab, setTab] = useState<"slots" | "bookings">("slots");
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const week = mondayOf(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const month = startOfMonth(anchor);
  const from = view === "week" ? week : month;
  const to = view === "week" ? addDays(week, 7) : addMonths(month, 1);
  const slots = useApi<SlotDto[]>(tab === "slots" ? `/appointments/slots?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}` : null);
  const list = useMemo(() => slots.data ?? [], [slots.data]);

  const toggle = (id: string) =>
    setPicked((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  function step(dir: 1 | -1) {
    setAnchor(view === "week" ? addDays(anchor, 7 * dir) : addMonths(anchor, dir));
    setPicked(new Set());
  }

  async function removeSelected(chosen: SlotDto[]) {
    const open = chosen.filter((s) => !s.booking);
    const skipped = chosen.length - open.length;
    for (const s of open) {
      try {
        await api(`/appointments/slots/${s.id}`, { method: "DELETE" });
      } catch {
        /* reported through the reload below */
      }
    }
    setPicked(new Set());
    setDialog(null);
    await slots.reload();
    if (open.length) toast(open.length === 1 ? translate("Slot removed.") : translate("{v0} slots removed.", {v0: open.length}));
    setNotice(skipped ? translate("{v0} booked {v1} not removed. Cancel the booking first.", {v0: skipped, v1: translate(skipped === 1 ? "slot was" : "slots were")}) : null);
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("Appointments")}</h1>
        {tab === "slots" && (
          <Button variant="primary" onClick={() => setDialog("add")} className="px-5">
            {translate("Add slots")}</Button>
        )}
      </div>
      <Tabs
        tabs={[
          { key: "slots", label: "Slots" },
          { key: "bookings", label: "Bookings" },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div className="text-sm text-muted">{translate("Times are in your time zone (")}{localTimeZone()}{translate("). Patients see them in theirs.")}</div>

      {tab === "slots" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex overflow-hidden rounded-lg border border-line bg-surface">
              {(["week", "month"] as const).map((v) => (
                <button key={v} onClick={() => (setView(v), setPicked(new Set()))} aria-pressed={view === v} className={`h-11 px-4 font-medium capitalize ${view === v ? "bg-surface-2 text-ink" : "bg-surface text-muted"}`}>
                  {translate(v === 'week' ? 'Week' : 'Month')}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => step(-1)} aria-label={translate("Previous")} className="flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-surface">
                <span className="directional-icon inline-block" aria-hidden="true">‹</span>
              </button>
              <span className="min-w-[160px] text-center font-semibold">
                {view === "week" ? translate("{v0} {v1} to {v2} {v3} {v4}", {v0: days[0].getDate(), v1: MONTH_NAMES[days[0].getMonth()].slice(0, 3), v2: days[6].getDate(), v3: MONTH_NAMES[days[6].getMonth()].slice(0, 3), v4: days[6].getFullYear()}) : `${MONTH_NAMES[month.getMonth()]} ${month.getFullYear()}`}
              </span>
              <button onClick={() => step(1)} aria-label={translate("Next")} className="flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-surface">
                <span className="directional-icon inline-block" aria-hidden="true">›</span>
              </button>
            </div>
          </div>

          {notice && (
            <div role="alert" className="rounded-lg border border-amber-line bg-amber-soft px-4 py-3 text-sm text-pending-ink">
              {translate(notice)}
            </div>
          )}
          {picked.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-2 py-2 ps-4 pe-2">
              <span className="flex-1 font-semibold">
                {picked.size} {picked.size === 1 ? translate("slot") : translate("slots")} {translate(" selected")}</span>
              <Button variant="danger" onClick={() => setDialog({ removeMany: list.filter((s) => picked.has(s.id)) })}>
                {translate("Remove")}</Button>
              <Button variant="ghost" onClick={() => setPicked(new Set())}>
                {translate("Clear")}</Button>
            </div>
          )}

          {slots.error && <ErrorState title={translate("We couldn't load your slots.")} onRetry={slots.reload} />}
          {slots.loading && <SkeletonBlock height={260} />}
          {!slots.loading && !slots.error && list.length === 0 && (
            <EmptyState title={translate("You haven't added any slots here yet.")} text={translate("Add your open times so patients can book them.")}>
              <Button variant="primary" onClick={() => setDialog("add")}>
                {translate("Add slots")}</Button>
            </EmptyState>
          )}

          {!slots.loading && !slots.error && list.length > 0 && view === "week" && (
            <div className="grid items-start gap-2.5 md:grid-cols-7">
              {days.map((d) => (
                <div key={d.toISOString()} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-2.5 md:min-h-[200px]">
                  <div className="text-sm font-semibold">
                    {DOW[(d.getDay() + 6) % 7]} {d.getDate()}
                  </div>
                  {list
                    .filter((s) => sameDay(new Date(s.startsAt), d))
                    .map((s) => (
                      <div key={s.id} className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 ${s.booking ? "border-[#BBD1F6] bg-accent-soft" : "border-[#BFE3EE] bg-[#EAF6FA]"}`}>
                        <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} aria-label={translate("Select {v0}", {v0: hhmm(s.startsAt)})} className="mt-1 h-[18px] w-[18px] accent-[var(--accent)]" />
                        <button onClick={() => setDialog({ edit: s })} className="min-w-0 text-start">
                          <div className="text-sm font-semibold">{timeRange(s.startsAt, s.endsAt)}</div>
                          <div className={`text-[13px] ${s.booking ? "text-accent-deep" : "text-aqua-deep"}`}>{s.booking ? translate("Booked · {v0}", {v0: s.booking.patientName}) : translate("Open")}</div>
                        </button>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}

          {!slots.loading && !slots.error && list.length > 0 && view === "month" && (
            <div className="grid grid-cols-7 gap-1.5">
              {DOW.map((d) => (
                <div key={d} className="px-1 py-0.5 text-xs text-muted">
                  {d}
                </div>
              ))}
              {monthCells(month).map((d, i) => {
                if (!d) return <div key={`b${i}`} />;
                const day = list.filter((s) => sameDay(new Date(s.startsAt), d));
                const booked = day.filter((s) => s.booking).length;
                const open = day.length - booked;
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => (setAnchor(d), setView("week"))}
                    className="flex min-h-[92px] flex-col items-start gap-1 rounded-lg border border-line bg-surface p-2 text-start hover:bg-bg"
                    aria-label={translate("{v0}: {v1} open, {v2} booked", {v0: longDate(d), v1: open, v2: booked})}
                  >
                    <span className="text-sm font-medium">{d.getDate()}</span>
                    {open > 0 && <span className="text-xs text-aqua-deep">{open} {translate(" open")}</span>}
                    {booked > 0 && <span className="text-xs text-accent-deep">{booked} {translate(" booked")}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "bookings" && <Bookings />}

      {dialog === "add" && (
        <AddSlots
          onClose={() => setDialog(null)}
          onAdded={async (count, firstStart) => {
            setDialog(null);
            setNotice(null);
            setAnchor(firstStart);
            toast(count === 1 ? translate("Slot added.") : translate("{count} slots added.", {count}));
            await slots.reload();
          }}
        />
      )}
      {dialog && typeof dialog === "object" && "edit" in dialog && (
        <EditSlot
          slot={dialog.edit}
          onClose={() => setDialog(null)}
          onChanged={async (message) => {
            setDialog(null);
            toast(message);
            await slots.reload();
          }}
        />
      )}
      {dialog && typeof dialog === "object" && "removeMany" in dialog && (
        <Dialog title={dialog.removeMany.length === 1 ? translate("Remove this slot?") : translate("Remove {v0} slots?", {v0: dialog.removeMany.length})} onClose={() => setDialog(null)}>
          {dialog.removeMany.some((s) => s.booking) && (
            <div className="rounded-lg border border-amber-line bg-amber-soft px-4 py-3 text-sm text-pending-ink">
              {translate("Booked slots can&apos;t be removed. Cancel their booking first. Only the open ones will be removed.")}</div>
          )}
          <DialogActions>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {translate("Cancel")}</Button>
            <Button variant="danger" onClick={() => removeSelected(dialog.removeMany)}>
              {translate("Remove")}</Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}

function AddSlots({ onClose, onAdded }: { onClose: () => void; onAdded: (count: number, firstStart: Date) => void }) {
  const translate = useT();
  const tomorrow = toDateInput(addDays(startOfDay(new Date()), 1));
  const [day, setDay] = useState(tomorrow);
  const [fromTime, setFromTime] = useState("09:00");
  const [toTime, setToTime] = useState("12:00");
  const [length, setLength] = useState("30");
  const [weeks, setWeeks] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    const minutes = Number(length);
    const repeat = Number(weeks);
    const start = localDateTime(day, fromTime);
    const end = localDateTime(day, toTime);
    if (!day || !fromTime || !toTime) return setError(translate("Choose the day and the times."));
    if (!(end > start)) return setError(translate("The end time must be after the start time."));
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 720) return setError(translate("Slot length must be between 5 and 720 minutes."));
    if (!Number.isInteger(repeat) || repeat < 1 || repeat > 12) return setError(translate("Repeat for 1 to 12 weeks."));

    const ranges: { startsAt: string; endsAt: string }[] = [];
    for (let w = 0; w < repeat; w++) {
      for (let t = start.getTime(); t + minutes * 60000 <= end.getTime(); t += minutes * 60000) {
        const s = addDays(new Date(t), w * 7);
        ranges.push({ startsAt: s.toISOString(), endsAt: new Date(s.getTime() + minutes * 60000).toISOString() });
      }
    }
    if (ranges.length === 0) return setError(translate("That time window is shorter than one slot."));
    if (ranges.length > 200) return setError(translate("That would make {v0} slots. Add at most 200 at a time.", {v0: ranges.length}));

    setBusy(true);
    setError(null);
    try {
      await api("/appointments/slots", { method: "POST", body: { slots: ranges } });
      onAdded(ranges.length, start);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : translate("Something went wrong. Try again."));
      setBusy(false);
    }
  }

  return (
    <Dialog title={translate("Add slots")} onClose={onClose}>
      <Field label={translate("Day")}>
        <Input type="date" value={day} min={tomorrow} onChange={(e) => setDay(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={translate("From")}>
          <Input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} />
        </Field>
        <Field label={translate("To")}>
          <Input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={translate("Slot length (minutes)")} hint={translate("The window is split into slots this long.")}>
          <Input inputMode="numeric" value={length} onChange={(e) => setLength(e.target.value)} />
        </Field>
        <Field label={translate("Repeat weekly for")} hint={translate("Number of weeks, 1 to 12.")}>
          <Input inputMode="numeric" value={weeks} onChange={(e) => setWeeks(e.target.value)} />
        </Field>
      </div>
      {error && (
        <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">
          {translate(error)}
        </div>
      )}
      <DialogActions>
        <Button variant="ghost" onClick={onClose}>
          {translate("Cancel")}</Button>
        <Button variant="primary" onClick={add} loading={busy} className="px-5">
          {translate("Add slots")}</Button>
      </DialogActions>
    </Dialog>
  );
}

function EditSlot({ slot, onClose, onChanged }: { slot: SlotDto; onClose: () => void; onChanged: (message: string) => void }) {
  const {longDate, shortDate} = useLocalizedFormats();
  const translate = useT();
  const start = new Date(slot.startsAt);
  const [day, setDay] = useState(toDateInput(start));
  const [fromTime, setFromTime] = useState(hhmm(slot.startsAt));
  const [toTime, setToTime] = useState(hhmm(slot.endsAt));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "remove" | "cancel" | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const booked = slot.booking;
  const started = start <= new Date();

  async function save() {
    const s = localDateTime(day, fromTime);
    const e = localDateTime(day, toTime);
    if (!(e > s)) return setError(translate("The end time must be after the start time."));
    setBusy("save");
    setError(null);
    try {
      await api(`/appointments/slots/${slot.id}`, { method: "PUT", body: { startsAt: s.toISOString(), endsAt: e.toISOString() } });
      onChanged(booked ? "Slot changed. The patient has been told." : "Slot changed.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : translate("Something went wrong. Try again."));
      setBusy(null);
    }
  }

  async function run(kind: "remove" | "cancel") {
    setBusy(kind);
    setError(null);
    try {
      if (kind === "remove") await api(`/appointments/slots/${slot.id}`, { method: "DELETE" });
      else await api(`/appointments/bookings/${booked!.bookingId}/cancel`, { method: "POST" });
      onChanged(kind === "remove" ? "Slot removed." : "Booking cancelled. The patient has been told.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : translate("Something went wrong. Try again."));
      setBusy(null);
    }
  }

  if (confirmCancel && booked) {
    return (
      <Dialog title={translate("Cancel this booking?")} onClose={() => setConfirmCancel(false)}>
        <p className="m-0 text-sm text-muted">
          {booked.patientName}, {shortDate(start)}, {timeRange(slot.startsAt, slot.endsAt)}{translate(". They will be told by email and in the portal, and the slot becomes open again.")}</p>
        {error && (
          <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">
            {translate(error)}
          </div>
        )}
        <DialogActions>
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
            {translate("Keep booking")}</Button>
          <Button variant="danger" onClick={() => run("cancel")} loading={busy === "cancel"}>
            {translate("Cancel booking")}</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog title={translate("Edit slot")} onClose={onClose}>
      <div className="text-sm text-muted">{longDate(start)}</div>
      {booked && (
        <div className="rounded-lg border border-amber-line bg-amber-soft px-4 py-3 text-sm text-pending-ink">
          {translate("Booked by ")}<b>{booked.patientName}</b>{translate(". If you change the time they are told by email. A booked slot can&apos;t be removed: cancel the booking first.")}</div>
      )}
      {started ? (
        <div className="text-sm text-muted">{translate("This slot has already started, so it can&apos;t be changed.")}</div>
      ) : (
        <>
          <Field label={translate("Day")}>
            <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={translate("From")}>
              <Input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} />
            </Field>
            <Field label={translate("To")}>
              <Input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} />
            </Field>
          </div>
        </>
      )}
      {error && (
        <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">
          {translate(error)}
        </div>
      )}
      <DialogActions>
        {!started && booked && (
          <Button variant="danger" onClick={() => setConfirmCancel(true)} className="me-auto">
            {translate("Cancel booking")}</Button>
        )}
        {!started && !booked && (
          <Button variant="danger" onClick={() => run("remove")} loading={busy === "remove"} className="me-auto">
            {translate("Remove slot")}</Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          {translate("Close")}</Button>
        {!started && (
          <Button variant="primary" onClick={save} loading={busy === "save"} className="px-5">
            {translate("Save")}</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

function Bookings() {
  const {shortDate} = useLocalizedFormats();
  const translate = useT();
  const router = useRouter();
  const toast = useToast();
  const [scope, setScope] = useState<"upcoming" | "past">("upcoming");
  const [page, setPage] = useState(0);
  const nowIso = useMemo(() => new Date().toISOString(), []);
  const range = scope === "upcoming" ? `from=${encodeURIComponent(nowIso)}&sort=slot.startsAt,asc` : `to=${encodeURIComponent(nowIso)}&sort=slot.startsAt,desc`;
  const { data, error, loading, reload } = useApi<Page<BookingDto>>(`/appointments/bookings?${range}&page=${page}&size=10`);
  const [cancelling, setCancelling] = useState<BookingDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const items = data?.content ?? [];

  async function messagePatient(b: BookingDto) {
    try {
      const c = await api<ConversationDto>("/chat/conversations", { method: "POST", body: { participantId: b.patientId } });
      router.push(`/clinic/messages?c=${c.id}`);
    } catch (e) {
      setFailure(e instanceof ApiError ? e.message : "We couldn't open the conversation.");
    }
  }

  async function cancel() {
    if (!cancelling) return;
    setBusy(true);
    setFailure(null);
    try {
      await api(`/appointments/bookings/${cancelling.id}/cancel`, { method: "POST" });
      setCancelling(null);
      toast(translate("Booking cancelled. The patient has been told."));
      await reload();
    } catch (e) {
      setFailure(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        tabs={[
          { key: "upcoming", label: "Upcoming" },
          { key: "past", label: "Past" },
        ]}
        active={scope}
        onChange={(s) => (setScope(s), setPage(0))}
      />
      {error && <ErrorState title={translate("We couldn't load your bookings.")} onRetry={reload} />}
      {failure && !cancelling && (
        <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-4 py-3 text-sm text-red">
          {translate(failure)}
        </div>
      )}
      {loading && <SkeletonBlock height={160} />}
      {!loading && !error && items.length === 0 && (
        <EmptyState title={scope === "upcoming" ? translate("No bookings yet.") : translate("No past bookings.")} text={scope === "upcoming" ? translate("Bookings appear here when patients book your open times.") : undefined} />
      )}
      {!loading && !error && data && items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {items.map((b) => (
            <div key={b.id} className="flex flex-col justify-between gap-2.5 border-b border-line px-5 py-3.5 md:flex-row md:items-center">
              <div className="flex flex-1 flex-wrap items-center gap-2.5 md:gap-6">
                <span className="min-w-[150px] font-semibold">{b.patientName}</span>
                <span>{shortDate(new Date(b.startsAt))}</span>
                <span className="text-muted">{timeRange(b.startsAt, b.endsAt)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => messagePatient(b)} className="flex min-h-11 items-center px-2 font-medium text-accent">
                  {translate("Message patient")}</button>
                {scope === "upcoming" && (
                  <Button variant="danger" onClick={() => (setFailure(null), setCancelling(b))}>
                    {translate("Cancel booking")}</Button>
                )}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-3 text-sm text-muted">
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
        <Dialog title={translate("Cancel this booking?")} onClose={() => setCancelling(null)}>
          <p className="m-0 text-sm text-muted">
            {cancelling.patientName}, {shortDate(new Date(cancelling.startsAt))}, {timeRange(cancelling.startsAt, cancelling.endsAt)}{translate(". They will be told by email and in the portal, and the slot becomes open again.")}</p>
          {failure && (
            <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">
              {translate(failure)}
            </div>
          )}
          <DialogActions>
            <Button variant="ghost" onClick={() => setCancelling(null)}>
              {translate("Keep booking")}</Button>
            <Button variant="danger" onClick={cancel} loading={busy}>
              {translate("Cancel booking")}</Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}
