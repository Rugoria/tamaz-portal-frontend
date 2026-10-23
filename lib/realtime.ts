"use client";

import { useSyncExternalStore } from "react";

/**
 * The live-update stream for this browser tab: one EventSource shared by every component on the page.
 * Messages are only "this changed" (a type and an id); the page then refetches through the normal API.
 * The stream is closed while the tab is hidden and reopened (with one refresh) when it is visible again.
 */

export type RealtimeMessage = { type: "case" | "notification" | "chat" | "appointment" | "resync"; id: string | null };
type Listener = (message: RealtimeMessage) => void;

const TYPES = ["case", "notification", "chat", "appointment"] as const;
/** If the browser gives up on a refused stream (an expired login), try again after this long. */
const RETRY_CLOSED_MS = 30_000;

let source: EventSource | null = null;
let wanted = false;
let live = false;
let everOpened = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();
const statusListeners = new Set<() => void>();

function setLive(value: boolean) {
  if (live === value) return;
  live = value;
  statusListeners.forEach((f) => f());
}

function emit(message: RealtimeMessage) {
  listeners.forEach((l) => l(message));
}

function open() {
  if (typeof window === "undefined" || typeof EventSource === "undefined" || source) return;
  const es = new EventSource("/api/events");
  source = es;
  es.onopen = () => {
    setLive(true);
    // After a reconnect, changes may have been missed while the line was down: ask every page to refresh once.
    if (everOpened) emit({ type: "resync", id: null });
    everOpened = true;
  };
  es.onerror = () => {
    setLive(false);
    // The browser reconnects by itself unless the server refused the stream; then it is closed for good, so try again later.
    if (es.readyState === EventSource.CLOSED) {
      source = null;
      if (wanted && !retryTimer) {
        retryTimer = setTimeout(() => {
          retryTimer = null;
          if (wanted) open();
        }, RETRY_CLOSED_MS);
      }
    }
  };
  for (const type of TYPES) {
    es.addEventListener(type, (event) => {
      let id: string | null = null;
      try {
        id = (JSON.parse((event as MessageEvent<string>).data) as { id?: string | null }).id ?? null;
      } catch {
        /* an unreadable message still means "something changed" */
      }
      emit({ type, id });
    });
  }
}

/** Opens the stream (once per tab) and keeps it open until {@link stopStream}. */
export function startStream() {
  wanted = true;
  open();
}

export function stopStream() {
  wanted = false;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  source?.close();
  source = null;
  setLive(false);
}

/** Pauses without forgetting that the page wants live updates (a hidden tab). */
export function pauseStream() {
  source?.close();
  source = null;
  setLive(false);
}

/** Resumes after {@link pauseStream}; the page refreshes once because it may have missed changes. */
export function resumeStream() {
  if (!wanted) return;
  open();
  emit({ type: "resync", id: null });
}

export function onRealtime(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True while the stream is open. Components poll rarely then, and as before when it is not. */
export function useRealtimeLive(): boolean {
  return useSyncExternalStore(
    (cb) => {
      statusListeners.add(cb);
      return () => statusListeners.delete(cb);
    },
    () => live,
    () => false,
  );
}

/** How often to ask again as a safety net: `fastMs` when there is no live stream, a slow backup when there is. */
export function pollMs(fastMs: number, isLive: boolean, slowMs = 120_000): number {
  return isLive ? slowMs : fastMs;
}
