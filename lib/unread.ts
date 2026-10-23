"use client";

import useSWR from "swr";
import { api } from "./api";
import { pollMs, useRealtimeLive } from "./realtime";
import type { ConversationDto, Page } from "./types";

/** Badge numbers for the bell and Messages. Cheap calls: pushed live, with a slow refresh as the safety net (every 30 seconds when there is no live stream). */
export function useUnread() {
  const live = useRealtimeLive();
  const notifications = useSWR<{ unread: number }>("/notifications/unread-count", (p: string) => api<{ unread: number }>(p), {
    refreshInterval: pollMs(30000, live),
    revalidateOnFocus: true,
  });
  const conversations = useSWR<Page<ConversationDto>>("/chat/conversations?size=50", (p: string) => api<Page<ConversationDto>>(p), {
    refreshInterval: pollMs(30000, live),
    revalidateOnFocus: true,
  });
  const messages = conversations.data?.content.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;
  return { notifications: notifications.data?.unread ?? 0, messages };
}
