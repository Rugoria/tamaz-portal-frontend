import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/clientIp";
import { BACKEND_URL, TOKEN_COOKIE } from "@/lib/session";

// Forwards /api/* to the Spring Boot backend and adds the login token from the httpOnly cookie.
async function forward(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = `${BACKEND_URL}/api/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;

  const headers: Record<string, string> = {};
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;
  const accept = req.headers.get("accept");
  if (accept) headers["Accept"] = accept;
  const ip = clientIp(req);
  if (ip) headers["X-Client-IP"] = ip;
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "We couldn't reach the server. Try again." }, { status: 502 });
  }

  const body = upstream.status === 204 ? null : await upstream.arrayBuffer();
  const res = new NextResponse(body, { status: upstream.status });
  const upstreamType = upstream.headers.get("content-type");
  if (upstreamType) res.headers.set("Content-Type", upstreamType);
  return res;
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
