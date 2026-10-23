"use client";

import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { onRealtime, pauseStream, resumeStream, startStream, stopStream, type RealtimeMessage } from "@/lib/realtime";

/** Data that does not change because a case or message did; a live update leaves it alone. */
const STATIC_PREFIXES = ["/views", "/me/", "/clinics", "/admin/view-templates", "/admin/record-requirements", "/admin/clearmoves-config"];

/** Which cached pieces a message makes stale. A case message refreshes everything on screen except the static data and the other areas. */
function matches(type: RealtimeMessage["type"], key: string): boolean {
  if (STATIC_PREFIXES.some((p) => key.startsWith(p))) return false;
  switch (type) {
    case "notification":
      return key.startsWith("/notifications");
    case "chat":
      return key.startsWith("/chat");
    case "appointment":
      return key.startsWith("/appointments");
    case "case":
      return !key.startsWith("/notifications") && !key.startsWith("/chat") && !key.startsWith("/appointments");
    default:
      return true; // resync: everything
  }
}

/**
 * Opens the live-update stream for a signed-in page and turns each message into a refresh of the data on screen that it makes stale.
 * Messages that arrive close together are handled once. Renders nothing.
 */
export function RealtimeProvider() {
  const { mutate } = useSWRConfig();

  useEffect(() => {
    const pending = new Set<RealtimeMessage["type"]>();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      timer = null;
      const kinds = [...pending];
      pending.clear();
      void mutate((key) => typeof key === "string" && kinds.some((k) => matches(k, key)));
    };

    const off = onRealtime((message) => {
      pending.add(message.type);
      // A short random delay as well, so many pages told at the same moment (a deploy, a busy minute) do not all ask at once.
      if (!timer) timer = setTimeout(flush, 300 + Math.random() * 300);
    });

    startStream();

    // A hidden tab does not need live updates: close the line, and open it again (with one refresh) when the person returns.
    const onVisibility = () => (document.hidden ? pauseStream() : resumeStream());
    document.addEventListener("visibilitychange", onVisibility);
    if (document.hidden) pauseStream();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      off();
      if (timer) clearTimeout(timer);
      stopStream();
    };
  }, [mutate]);

  return null;
}
