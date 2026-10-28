import {isLocale} from "@/i18n/routing";
function loginPath() { const locale = window.location.pathname.split("/")[1]; return `/${isLocale(locale) ? locale : "en"}/login`; }
// Browser-side client. Every call goes to this app's own /api/* proxy, never straight to the backend.

export class ApiError extends Error {
  status: number;
  /** Set on a 429: how long until the limit lifts. */
  retryAfterSeconds?: number;
  /** Set when the backend names the problem, for example EMAIL_NOT_VERIFIED. */
  code?: string;
  /** The admin's reason, on ACCOUNT_REJECTED. */
  reason?: string;
  constructor(status: number, message: string, retryAfterSeconds?: number, code?: string, reason?: string) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.code = code;
    this.reason = reason;
  }
}

function reasonOf(data: unknown): string | undefined {
  return data && typeof data === "object" && "reason" in data && typeof (data as { reason: unknown }).reason === "string" ? (data as { reason: string }).reason : undefined;
}

function codeOf(data: unknown): string | undefined {
  return data && typeof data === "object" && "code" in data && typeof (data as { code: unknown }).code === "string" ? (data as { code: string }).code : undefined;
}

function retryAfterOf(data: unknown): number | undefined {
  return data && typeof data === "object" && "retryAfterSeconds" in data && typeof (data as { retryAfterSeconds: unknown }).retryAfterSeconds === "number"
    ? (data as { retryAfterSeconds: number }).retryAfterSeconds
    : undefined;
}

/** "Too many attempts. Try again in N minutes." for a 429, else the error's own message; both go through `translate`. */
export function friendlyError(err: unknown, translate: (source: string, values?: Record<string, string | number>) => string): string {
  if (err instanceof ApiError && err.status === 429) {
    const minutes = Math.max(1, Math.ceil((err.retryAfterSeconds ?? 60) / 60));
    return translate(minutes === 1 ? "Too many attempts. Try again in 1 minute." : "Too many attempts. Try again in {minutes} minutes.", { minutes });
  }
  return translate(err instanceof Error ? err.message : "Something went wrong. Try again.");
}

async function parse(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init.method ?? "GET",
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await parse(res);
  if (!res.ok) {
    // Signed out or the token expired: back to sign in.
    if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.endsWith("/login")) {
      // A full page load on purpose: it also clears everything cached in the browser for the old session.
      window.location.href = loginPath();
    }
    const message =
      data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Something went wrong. Try again.";
    throw new ApiError(res.status, message, retryAfterOf(data));
  }
  return data as T;
}

/** Cookie-setting calls (sign in, sign up) go through /api/session/*, not the plain proxy. */
export async function sessionCall<T>(action: "login" | "register" | "register-doctor" | "register-clinic" | "change-password" | "verify-email" | "resend-code", body: unknown): Promise<T> {
  const res = await fetch(`/api/session/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parse(res);
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Something went wrong. Try again.";
    throw new ApiError(res.status, message, retryAfterOf(data), codeOf(data), reasonOf(data));
  }
  return data as T;
}

export async function signOut(): Promise<void> {
  await fetch("/api/session/logout", { method: "POST" });
  window.location.href = loginPath();
}
