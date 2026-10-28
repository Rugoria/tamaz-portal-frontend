import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL, PROXY_HEADERS, TOKEN_COOKIE } from "@/lib/session";

// The live-update stream. It never finishes, so it cannot go through the catch-all /api proxy (that one reads the whole
// response before sending it): this route hands the backend's body straight to the browser, chunk by chunk, with no buffering.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Please sign in again." }, { status: 401 });

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/api/events`, {
      headers: { ...PROXY_HEADERS, Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
      cache: "no-store",
      // When the browser leaves, stop the backend stream too.
      signal: req.signal,
    });
  } catch {
    return NextResponse.json({ message: "We couldn't reach the server. Try again." }, { status: 502 });
  }
  // A refusal (expired login) is passed on as it is, so the browser stops reconnecting.
  if (!upstream.ok || !upstream.body) return new NextResponse(null, { status: upstream.status === 200 ? 502 : upstream.status });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Tell nginx-style proxies not to hold messages back.
      "X-Accel-Buffering": "no",
    },
  });
}
