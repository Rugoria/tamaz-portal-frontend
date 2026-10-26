"use client";
import { pollMs, useRealtimeLive } from "@/lib/realtime";
import {useLocalizedFormats} from "@/i18n/formats";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { mutate as globalMutate } from "swr";
import { api, ApiError } from "@/lib/api";

import { useApi } from "@/lib/hooks";
import { ROLE_LABEL } from "@/lib/status";
import type { CaseCardDto, CaseDto, ClinicSummary, ConversationDto, MessageDto, Page, PatientSummary, Role, UserDto } from "@/lib/types";
import { useDebounced } from "@/lib/useDebounced";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Field";
import { RolePill } from "@/components/ui/Chip";
import { Icon } from "@/components/shell/Icon";
import { ErrorState } from "@/components/ui/states";

/** True on screens at least 768px wide. False on the server and on first paint, so there is no hydration mismatch. */
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia("(min-width: 768px)");
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => false,
  );
}

interface Person {
  /** null = the tamaz team (the company's shared inbox). */
  id: string | null;
  name: string;
  role: string;
}

function convoName(c: ConversationDto, viewer: Role): { name: string; role: string } {
  if (c.withClient && viewer !== "ADMIN") return { name: "tamaz team", role: "tamaz team" };
  return { name: c.otherPartyName ?? "Unknown", role: c.otherPartyRole ? ROLE_LABEL[c.otherPartyRole] : "" };
}

/** Everyone the viewer is allowed to start a conversation with (who may talk to whom is enforced by the backend too). `search` is sent to the server. */
function usePeople(role: Role, search: string): { people: Person[]; loading: boolean } {
  const isAdmin = role === "ADMIN";
  const isCustomer = role === "CUSTOMER";
  const isClinic = role === "CLINIC";
  const term = search ? `&search=${encodeURIComponent(search)}` : "";
  const clinics = useApi<ClinicSummary[]>(isCustomer ? "/clinics" : null);
  const adminClinics = useApi<Page<UserDto>>(isAdmin ? `/admin/clinics?size=20${term}` : null);
  const adminDoctors = useApi<Page<UserDto>>(isAdmin ? `/admin/doctors?size=20${term}` : null);
  const adminCustomers = useApi<Page<UserDto>>(isAdmin ? `/admin/customers?size=20${term}` : null);
  // A clinic can write to patients it has linked to a case (the patients list carries the linked account).
  const patients = useApi<Page<PatientSummary>>(isClinic ? `/patients?size=30${term}` : null);

  return useMemo(() => {
    const people: Person[] = [];
    const needle = search.toLowerCase();
    if (!isAdmin && (!needle || "tamaz team".includes(needle))) people.push({ id: null, name: "tamaz team", role: "tamaz team" });
    if (isCustomer) clinics.data?.filter((c) => c.name.toLowerCase().includes(needle)).forEach((c) => people.push({ id: c.id, name: c.name, role: "Clinic" }));
    if (isAdmin) {
      adminClinics.data?.content.forEach((u) => people.push({ id: u.id, name: u.fullName, role: "Clinic" }));
      adminDoctors.data?.content.forEach((u) => people.push({ id: u.id, name: u.fullName, role: "Doctor" }));
      adminCustomers.data?.content.forEach((u) => people.push({ id: u.id, name: u.fullName, role: "Patient" }));
    }
    if (isClinic) patients.data?.content.forEach((p) => p.linkedCustomerId && people.push({ id: p.linkedCustomerId, name: p.name, role: "Patient" }));
    const loading = clinics.loading || adminClinics.loading || adminDoctors.loading || adminCustomers.loading || patients.loading;
    return { people, loading };
  }, [search, isAdmin, isCustomer, isClinic, clinics.data, clinics.loading, adminClinics.data, adminClinics.loading, adminDoctors.data, adminDoctors.loading, adminCustomers.data, adminCustomers.loading, patients.data, patients.loading]);
}

function NewMessageDialog({ role, onClose, onStarted }: { role: Role; onClose: () => void; onStarted: (c: ConversationDto) => void }) {
  const translate = useT();
  const [query, setQuery] = useState("");
  const { people, loading } = usePeople(role, useDebounced(query.trim()));
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shown = people;

  async function start() {
    if (picked === undefined) return;
    setBusy(true);
    setError(null);
    try {
      const c = await api<ConversationDto>("/chat/conversations", { method: "POST", body: { participantId: picked } });
      onStarted(c);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : translate("Something went wrong. Try again."));
      setBusy(false);
    }
  }

  return (
    <Dialog title={translate("New message")} onClose={onClose}>
      <Input
        placeholder={role === "ADMIN" ? translate("Search clinics, doctors and patients") : translate("Search")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={translate("Search people")}
      />
      <div className="max-h-[300px] overflow-y-auto rounded-lg border border-line">
        {loading && <div className="p-4 text-sm text-muted">{translate("Loading")}</div>}
        {!loading && shown.length === 0 && <div className="p-4 text-sm text-muted">{translate("No one found.")}</div>}
        {shown.map((p) => {
          const on = picked === p.id;
          return (
            <button
              key={p.id ?? "tamaz"}
              onClick={() => setPicked(p.id)}
              aria-pressed={on}
              className={`flex min-h-12 w-full items-center justify-between border-b border-line px-3.5 text-start last:border-b-0 ${on ? "bg-surface-2 font-semibold" : "bg-surface"}`}
            >
              <span>{p.id === null ? translate("tamaz team") : p.name}</span>
              <RolePill label={p.role} />
            </button>
          );
        })}
      </div>
      {error && (
        <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">
          {translate(error)}
        </div>
      )}
      <DialogActions>
        <Button variant="ghost" onClick={onClose}>
          {translate("Cancel")}</Button>
        <Button variant="primary" onClick={start} disabled={picked === undefined} loading={busy} className="px-[22px]">
          {translate("Start conversation")}</Button>
      </DialogActions>
    </Dialog>
  );
}

const caseHref = (role: Role, id: string) => `/${role === "ADMIN" ? "admin" : role === "DOCTOR" ? "doctor" : "clinic"}/cases/${id}`;

/** A small card for the case a message is about. It opens the case. */
function CaseCard({ card, role, mine }: { card: CaseCardDto; role: Role; mine: boolean }) {
  const translate = useT();
  return (
    <Link
      href={caseHref(role, card.id)}
      className={`mt-1.5 block rounded-lg border px-3 py-2 text-sm no-underline ${mine ? "border-line bg-surface text-ink" : "border-line bg-bg text-ink"}`}
    >
      <div className="text-xs text-muted">{translate("About this case")}</div>
      <div className="font-medium">{card.patientName}</div>
      <div className="text-[13px] text-muted">{translate(card.statusLabel)}</div>
    </Link>
  );
}

/** Pick the case a message is about: a clinic or doctor picks among their own cases, the admin among the cases of the person in the conversation. */
function AttachCaseDialog({ role, accountId, onPick, onClose }: { role: Role; accountId: string | null; onPick: (c: CaseCardDto) => void; onClose: () => void }) {
  const translate = useT();
  const [query, setQuery] = useState("");
  const term = useDebounced(query.trim());
  const own = useApi<Page<CaseDto>>(role === "ADMIN" ? null : `/cases?size=10${term ? `&search=${encodeURIComponent(term)}` : ""}`);
  const theirs = useApi<Page<CaseDto>>(role === "ADMIN" && accountId ? `/admin/users/${accountId}/cases?size=10` : null);
  const loading = own.loading || theirs.loading;
  const needle = term.toLowerCase();
  const shown = (role === "ADMIN" ? theirs.data : own.data)?.content.filter((c) => !needle || c.patientFullName.toLowerCase().includes(needle)) ?? [];

  return (
    <Dialog title={translate("Attach a case")} onClose={onClose}>
      <Input placeholder={translate("Search by patient name")} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={translate("Search by patient name")} />
      <div className="max-h-[300px] overflow-y-auto rounded-lg border border-line">
        {loading && <div className="p-4 text-sm text-muted">{translate("Loading")}</div>}
        {!loading && shown.length === 0 && <div className="p-4 text-sm text-muted">{translate("No cases found.")}</div>}
        {shown.map((c) => (
          <button
            key={c.id}
            onClick={() => onPick({ id: c.id, patientName: c.patientFullName, statusLabel: c.displayStatus })}
            className="flex min-h-12 w-full items-center justify-between border-b border-line bg-surface px-3.5 text-start last:border-b-0 hover:bg-bg"
          >
            <span>{c.patientFullName}</span>
            <span className="text-[13px] text-muted">{translate(c.displayStatus)}</span>
          </button>
        ))}
      </div>
      <DialogActions>
        <Button variant="ghost" onClick={onClose}>
          {translate("Cancel")}</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Conversations plus the open thread. Shared by every portal; the backend decides who may talk to whom. */
export function MessagesView({ role, embedded = false }: { role: Role; embedded?: boolean }) {
  const {relative} = useLocalizedFormats();
  const translate = useT();
  const params = useSearchParams();
  const [selected, setSelected] = useState<string | null>(params.get("c"));
  const [dialog, setDialog] = useState(false);
  // "Message Tamaz about this case" arrives with ?case=<id>: open (or create) the chat with Tamaz and attach that case.
  const caseParam = params.get("case");
  const [startError, setStartError] = useState(false);

  const streaming = useRealtimeLive();
  const convos = useApi<Page<ConversationDto>>("/chat/conversations?size=50", { refreshInterval: pollMs(30000, streaming) });
  const list = convos.data?.content ?? [];
  const isDesktop = useIsDesktop();
  // On a desktop the first conversation opens by itself; on a phone the list shows until one is tapped.
  const current = list.find((c) => c.id === selected) ?? (isDesktop ? (list[0] ?? null) : null);
  const open = current?.id ?? null;

  useEffect(() => {
    if (!caseParam || params.get("c") || role === "ADMIN" || role === "CUSTOMER") return;
    api<ConversationDto>("/chat/conversations", { method: "POST", body: { participantId: null } })
      .then((c) => convos.reload().then(() => setSelected(c.id)))
      .catch(() => setStartError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseParam]);

  return (
    <div
      className={
        embedded
          ? "flex h-[calc(100dvh-200px)] min-h-[480px] overflow-hidden rounded-xl border border-line bg-bg"
          : "-mx-4 -my-6 flex h-[calc(100dvh-56px)] overflow-hidden bg-bg md:-m-8 md:h-screen"
      }
    >
      {/* Conversation list */}
      <div className={`${open ? "hidden md:flex" : "flex"} w-full flex-none flex-col border-r border-line bg-surface md:w-[360px]`}>
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <h1 className="m-0 text-xl font-semibold">{translate("Messages")}</h1>
          <Button size="md" onClick={() => setDialog(true)}>
            {translate("New message")}</Button>
        </div>
        {convos.error && (
          <div className="p-4">
            <ErrorState title={translate("We couldn't load your messages.")} onRetry={convos.reload} />
          </div>
        )}
        {convos.loading && <div className="tz-pulse px-5 py-6 text-sm text-muted">{translate("Loading")}</div>}
        {!convos.loading && !convos.error && list.length === 0 && (
          <div className="px-6 py-12 text-center text-muted">
            {role === "ADMIN" ? translate("No conversations yet.") : translate("No conversations yet. Start one with the tamaz team.")}
          </div>
        )}
        {list.map((c) => {
          const n = convoName(c, role);
          const on = c.id === open;
          return (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              aria-current={on ? "true" : undefined}
              className={`flex min-h-[68px] items-center gap-3 border-t border-line px-5 py-3.5 text-start ${on ? "bg-surface-2" : "bg-surface hover:bg-bg"}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`truncate ${c.unreadCount ? "font-semibold" : "font-medium"}`}>{c.withClient && role !== "ADMIN" ? translate("tamaz team") : n.name}</span>
                  {n.role && <RolePill label={n.role} />}
                </div>
                <div className="mt-0.5 text-[13px] text-muted">{c.lastMessageAt ? relative(c.lastMessageAt) : translate("No messages yet")}</div>
              </div>
              {c.unreadCount > 0 && (
                <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-white">{c.unreadCount}</span>
              )}
            </button>
          );
        })}
        {role === "ADMIN" && !convos.loading && (
          <div className="mt-auto border-t border-line px-5 py-4 text-[13px] text-muted">{translate("Conversations between clinics and patients are private and not shown here.")}</div>
        )}
      </div>

      {/* Thread */}
      <div className={`${open ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        {current ? (
          <Thread key={current.id} conversation={current} role={role} initialCase={caseParam} onBack={() => setSelected(null)} onSent={convos.reload} />
        ) : (
          <div className="m-auto px-6 text-center text-muted">{startError ? translate("We couldn't open the chat. Try again.") : list.length ? translate("Select a conversation.") : translate("Start a conversation with New message.")}</div>
        )}
      </div>

      {dialog && (
        <NewMessageDialog
          role={role}
          onClose={() => setDialog(false)}
          onStarted={async (c) => {
            setDialog(false);
            await convos.reload();
            setSelected(c.id);
          }}
        />
      )}
    </div>
  );
}

/**
 * One open conversation: the messages, the composer and the case attachment. Used by the Messages screen (with a back button on a phone) and by the
 * side panel on a case page (with a close button, and that case offered as "Attach this case").
 */
export function Thread({ conversation, role, initialCase = null, suggestCase = null, onBack, onClose, onSent }: {
  conversation: ConversationDto;
  role: Role;
  initialCase?: string | null;
  suggestCase?: CaseCardDto | null;
  onBack?: () => void;
  onClose?: () => void;
  onSent?: () => void;
}) {
  const {relative} = useLocalizedFormats();
  const translate = useT();
  const [pages, setPages] = useState(1);
  const [text, setText] = useState("");
  // Messages typed but not yet confirmed by the server. They show at once, then become real messages (or fail).
  const [pending, setPending] = useState<{ tempId: string; body: string; createdAt: string; state: "sending" | "failed"; error?: string; card: CaseCardDto | null }[]>([]);
  // The case the next message will be about. A customer can't attach one yet, and only a chat with Tamaz can carry one.
  const canAttach = role !== "CUSTOMER" && conversation.withClient;
  // undefined = the person has not chosen yet, so a case that arrived with ?case=<id> shows; null = they removed it.
  const [chosen, setChosen] = useState<CaseCardDto | null | undefined>(undefined);
  const [picking, setPicking] = useState(false);
  const preset = useApi<CaseDto>(canAttach && initialCase ? `/cases/${initialCase}` : null);
  const presetCard: CaseCardDto | null = preset.data ? { id: preset.data.id, patientName: preset.data.patientFullName, statusLabel: preset.data.displayStatus } : null;
  const attached = chosen === undefined ? presetCard : chosen;
  const setAttached = setChosen;
  const bottom = useRef<HTMLDivElement>(null);
  const name = convoName(conversation, role);

  // Newest first from the backend. Page 0 refreshes every 20 seconds; older pages are loaded on request.
  const streaming = useRealtimeLive();
  const newest = useApi<Page<MessageDto>>(`/chat/conversations/${conversation.id}/messages?page=0&size=30`, { refreshInterval: pollMs(20000, streaming) });
  const [olderPages, setOlderPages] = useState<MessageDto[][]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Opening a conversation clears its unread count and its chat notification.
  useEffect(() => {
    api(`/chat/conversations/${conversation.id}/read`, { method: "POST" })
      .then(() => Promise.all([globalMutate("/chat/conversations?size=50"), globalMutate("/notifications/unread-count")]))
      .catch(() => {});
  }, [conversation.id]);

  const messages = useMemo(() => {
    const fresh = newest.data?.content ?? [];
    const all = [...fresh, ...olderPages.flat()];
    const seen = new Set<string>();
    return all.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true))).reverse();
  }, [newest.data, olderPages]);

  useEffect(() => {
    if (pages === 1) bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pending.length, pages]);

  const hasOlder = newest.data ? messages.length < newest.data.totalElements : false;

  async function loadOlder() {
    setLoadingOlder(true);
    try {
      const next = await api<Page<MessageDto>>(`/chat/conversations/${conversation.id}/messages?page=${pages}&size=30`);
      setOlderPages((cur) => [...cur, next.content]);
      setPages((p) => p + 1);
    } finally {
      setLoadingOlder(false);
    }
  }

  async function post(tempId: string, body: string, card: CaseCardDto | null) {
    setPending((cur) => cur.map((m) => (m.tempId === tempId ? { ...m, state: "sending", error: undefined } : m)));
    try {
      await api(`/chat/conversations/${conversation.id}/messages`, { method: "POST", body: card ? { body, caseId: card.id } : { body } });
      await newest.reload();
      setPending((cur) => cur.filter((m) => m.tempId !== tempId));
      onSent?.();
    } catch (err) {
      const error = err instanceof ApiError ? err.message : "Your message wasn't sent.";
      setPending((cur) => cur.map((m) => (m.tempId === tempId ? { ...m, state: "failed", error } : m)));
    }
  }

  function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    const tempId = `p${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
    const card = attached;
    setText("");
    setAttached(null);
    setPending((cur) => [...cur, { tempId, body, createdAt: new Date().toISOString(), state: "sending", card }]);
    void post(tempId, body, card);
  }

  return (
    <>
      <div className="flex min-h-[60px] items-center gap-2.5 border-b border-line bg-surface px-3 py-3 md:px-5">
        {onBack && (
          <button onClick={onBack} aria-label={translate("Back to conversations")} className="flex h-11 w-11 items-center justify-center md:hidden">
            <Icon name="back" />
          </button>
        )}
        <span className="text-[17px] font-semibold">{conversation.withClient && role !== "ADMIN" ? translate("tamaz team") : name.name}</span>
        {name.role && <RolePill label={name.role} />}
        {onClose && (
          <button onClick={onClose} className="ms-auto h-11 px-2 text-sm text-muted">
            {translate("Close")}</button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-5 md:px-7">
        {newest.error && <ErrorState title={translate("We couldn't load this conversation.")} onRetry={newest.reload} />}
        {!newest.loading && !newest.error && messages.length === 0 && <div className="m-auto text-muted">{translate("No messages yet. Write the first one.")}</div>}
        {hasOlder && (
          <div className="self-center">
            <Button size="md" onClick={loadOlder} loading={loadingOlder} className="text-sm !text-accent">
              {translate("Load older messages")}</Button>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`max-w-[85%] md:max-w-[540px] ${m.mine ? "self-end" : "self-start"}`}>
            <div className={`mb-1 text-xs text-muted ${m.mine ? "text-end" : ""}`}>
              {m.mine ? translate("You") : m.senderRole === "ADMIN" ? translate("tamaz team") : m.senderName} · {relative(m.createdAt)}
            </div>
            <div className={`whitespace-pre-wrap break-words rounded-xl border px-3.5 py-2.5 ${m.mine ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink"}`} dir="auto">{m.body}</div>
            {m.attachedCase && <CaseCard card={m.attachedCase} role={role} mine={m.mine} />}
            {m.mine && (
              <div className="mt-1 flex items-center justify-end gap-1 text-xs text-muted">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <path d="M5 12l5 5 9-10" />
                </svg>
                {translate("Sent")}</div>
            )}
          </div>
        ))}
        {pending.map((m) => (
          <div key={m.tempId} className="max-w-[85%] self-end md:max-w-[540px]">
            <div className="mb-1 text-end text-xs text-muted">{translate("You · Just now")}</div>
            <div className={`whitespace-pre-wrap break-words rounded-xl border px-3.5 py-2.5 text-white ${m.state === "failed" ? "border-red bg-red" : "border-accent bg-accent opacity-70"}`}>{m.body}</div>
            {m.card && <CaseCard card={m.card} role={role} mine />}
            <div className={`mt-1 flex flex-wrap items-center justify-end gap-2 text-xs ${m.state === "failed" ? "text-red" : "text-muted"}`} role={m.state === "failed" ? "alert" : undefined}>
              {m.state === "sending" ? (
                <span className="flex items-center gap-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  {translate("Sending")}</span>
              ) : (
                <>
                  <span>{m.error ? `${translate(m.error)} ` : ""}{translate("Not sent.")}</span>
                  <button onClick={() => void post(m.tempId, m.body, m.card)} className="min-h-8 font-medium underline">
                    {translate("Retry")}</button>
                  <button onClick={() => setPending((cur) => cur.filter((x) => x.tempId !== m.tempId))} className="min-h-8 underline">
                    {translate("Remove")}</button>
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="flex flex-col gap-2 border-t border-line bg-surface px-3 py-3 md:px-5">
        {attached && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg px-3 py-2 text-sm">
            <span className="min-w-0 truncate">
              <span className="text-muted">{translate("About this case")}: </span>
              <span className="font-medium">{attached.patientName}</span>
            </span>
            <button type="button" onClick={() => setAttached(null)} aria-label={translate("Remove the attached case")} className="min-h-8 px-1 text-muted">
              ×
            </button>
          </div>
        )}
        {canAttach && !attached && (
          <div className="flex flex-wrap gap-2">
            {suggestCase && (
              <Button type="button" variant="ghost" onClick={() => setAttached(suggestCase)} className="px-3 text-sm">
                {translate("Attach this case")}</Button>
            )}
            <Button type="button" variant="ghost" onClick={() => setPicking(true)} className="px-3 text-sm">
              {translate("Attach a case")}</Button>
          </div>
        )}
        <div className="flex gap-2 md:gap-3">
          <Input placeholder={translate("Write a message")} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} aria-label={translate("Write a message")} className="flex-1" />
          <Button type="submit" variant="primary" disabled={!text.trim()} className="px-5 md:px-[22px]">
            {translate("Send")}</Button>
        </div>
      </form>
      {picking && (
        <AttachCaseDialog
          role={role}
          accountId={conversation.otherPartyId}
          onPick={(c) => {
            setAttached(c);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}
