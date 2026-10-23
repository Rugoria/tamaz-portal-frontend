"use client";
import {useLocalizedFormats} from "@/i18n/formats";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import { useState } from "react";
import { mutate as globalMutate } from "swr";
import { api } from "@/lib/api";

import { useApi } from "@/lib/hooks";
import type { NotificationDto, Page, Role } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/states";

const PAGE_SIZE = 20;

/** Where a notification leads. Case notifications open the case, chat notifications open the conversation. */
function target(n: NotificationDto, role: Role, base: string): string | null {
  if (n.type === "CHAT_MESSAGE" && n.conversationId) return `${base}/messages?c=${n.conversationId}`;
  if (n.type === "APPOINTMENT" && role !== "ADMIN") return `${base}/appointments`;
  if (n.type === "CASE_STATUS" && n.caseId) {
    if (role === "CUSTOMER") return `${base}/aligners/${n.caseId}`;
    return `${base}/cases/${n.caseId}`;
  }
  return null;
}

/** The notifications list, shared by every portal. `base` is the portal's path prefix, e.g. /clinic or /customer. */
export function NotificationsView({ role, base }: { role: Role; base: string }) {
  const {relative} = useLocalizedFormats();
  const translate = useT();
  const [page, setPage] = useState(0);
  const path = `/notifications?page=${page}&size=${PAGE_SIZE}`;
  const { data, error, loading, reload } = useApi<Page<NotificationDto>>(path);

  async function refreshBadges() {
    await Promise.all([reload(), globalMutate("/notifications/unread-count")]);
  }

  async function markRead(id: string) {
    await api(`/notifications/${id}/read`, { method: "PATCH" });
    await refreshBadges();
  }

  async function markAll() {
    await api("/notifications/read-all", { method: "POST" });
    await refreshBadges();
  }

  const items = data?.content ?? [];
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("Notifications")}</h1>
        {!loading && !error && items.length > 0 && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted">{unread} {translate(" unread")}</span>
            {unread > 0 && (
              <Button variant="secondary" size="sm" onClick={markAll}>
                {translate("Mark all as read")}</Button>
            )}
          </div>
        )}
      </div>

      {error && <ErrorState title={translate("We couldn't load your notifications.")} onRetry={reload} />}

      {loading && (
        <div className="tz-pulse rounded-xl border border-line bg-surface" aria-busy="true" aria-label={translate("Loading")}>
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="flex flex-col gap-2.5 border-b border-line px-6 py-5">
              <div className="h-3.5 w-[30%] rounded bg-surface-2" />
              <div className="h-3 w-[70%] rounded bg-surface-2" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-line bg-surface px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-aqua-soft text-aqua">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M5 12l5 5 9-10" />
            </svg>
          </div>
          <div className="text-lg font-semibold">{translate("You&apos;re all caught up.")}</div>
          <div className="mt-1.5 text-muted">
            {role === "CUSTOMER" ? translate("New updates about your aligners will show here.") : translate("New updates will show here.")}
          </div>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {items.map((n) => {
            const href = target(n, role, base);
            const isUnread = !n.readAt;
            const body = (
              <div className="min-w-0 flex-1">
                <div className={isUnread ? "font-semibold" : ""}>
                  {n.subject}
                  {n.type === "CHAT_MESSAGE" && n.messageCount > 1 && <span className="ms-2 text-sm font-normal text-muted">{n.messageCount} {translate(" new messages")}</span>}
                </div>
                <div className="mt-1 whitespace-pre-line text-sm text-muted">{n.body}</div>
              </div>
            );
            return (
              <div key={n.id} className="flex items-start gap-4 border-b border-line px-5 py-4 md:px-6 md:py-[18px]">
                <span className="mt-[7px] h-2.5 w-2.5 flex-none rounded-full" style={{ background: isUnread ? "var(--accent)" : "transparent" }} aria-label={isUnread ? translate("Unread") : undefined} />
                {href ? (
                  <Link href={href} onClick={() => isUnread && markRead(n.id)} className="flex min-w-0 flex-1 text-ink no-underline hover:text-ink">
                    {body}
                  </Link>
                ) : (
                  body
                )}
                <div className="flex flex-none flex-col items-end gap-1.5">
                  <span className="text-[13px] text-muted">{relative(n.createdAt)}</span>
                  {isUnread && (
                    <button onClick={() => markRead(n.id)} className="min-h-9 text-sm text-accent">
                      {translate("Mark as read")}</button>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between px-6 py-3.5 text-sm text-muted">
            <span>
              {translate("Showing ")}{data!.number * data!.size + 1} {translate(" to ")}{data!.number * data!.size + items.length} {translate(" of ")}{data!.totalElements}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={data!.first} className="h-9 rounded-lg border border-line bg-surface px-3.5 text-muted disabled:cursor-not-allowed enabled:text-ink">
                {translate("Previous")}</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={data!.last} className="h-9 rounded-lg border border-line bg-surface px-3.5 text-muted disabled:cursor-not-allowed enabled:text-ink">
                {translate("Next")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

