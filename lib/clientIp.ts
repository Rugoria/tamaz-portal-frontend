import "server-only";
import type { NextRequest } from "next/server";

/**
 * The visitor's address, for the backend's rate limits (it only ever sees this server's own address). Only headers our own
 * hosting sets can be trusted: a visitor can send any header, and a made-up address per request would get around the limits.
 * On Vercel (VERCEL=1) that is X-Real-IP, which Vercel overwrites with the real address. Elsewhere it is the last
 * X-Forwarded-For entry, the one our own load balancer added (earlier ones can be made up by the visitor).
 * Empty when nothing is known, and the backend then falls back to the socket address.
 */
export function clientIp(req: NextRequest): string {
  if (process.env.VERCEL === "1") return req.headers.get("x-real-ip")?.trim() ?? "";
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.headers.get("x-real-ip")?.trim() ?? "";
}
