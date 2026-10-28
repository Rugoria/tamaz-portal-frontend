import { NextResponse } from "next/server";

// The load balancer's health check: the web server is up. It does not call the backend, so a backend restart does not take the portal out of rotation.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}
