import "server-only";
import type { NextRequest } from "next/server";

/**
 * The visitor's address, for the backend's rate limits (it only ever sees this server's own address). Cloudflare's header first;
 * otherwise the last X-Forwarded-For entry, which is the one our own load balancer added (earlier ones can be made up by the visitor).
 * Empty when nothing is known, and the backend then falls back to the socket address.
 */
export function clientIp(req: NextRequest): string {
  const cloudflare = req.headers.get("cf-connecting-ip");
  if (cloudflare) return cloudflare.trim();
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.headers.get("x-real-ip")?.trim() ?? "";
}
