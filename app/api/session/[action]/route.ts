import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/clientIp";
import { BACKEND_URL, PROXY_HEADERS, TOKEN_COOKIE, USER_COOKIE } from "@/lib/session";
import type { LoginResponse } from "@/lib/types";

const BACKEND_PATH: Record<string, string> = {
  login: "/api/auth/login",
  register: "/api/auth/register",
  "change-password": "/api/me/password",
  "register-doctor": "/api/auth/register/doctor",
  "register-clinic": "/api/auth/register/clinic",
  "verify-email": "/api/auth/verify-email",
  "resend-code": "/api/auth/resend-code",
};

// The JWT lasts 60 minutes on the backend; the cookie matches.
const MAX_AGE_SECONDS = 60 * 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;

  if (action === "logout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(TOKEN_COOKIE);
    res.cookies.delete(USER_COOKIE);
    return res;
  }

  const path = BACKEND_PATH[action];
  if (!path) return NextResponse.json({ message: "Not found" }, { status: 404 });
  // Changing the password signs every older session out, so the answer carries a new token that replaces this cookie.
  const signedIn = action === "change-password" ? req.cookies.get(TOKEN_COOKIE)?.value : undefined;
  if (action === "change-password" && !signedIn) return NextResponse.json({ message: "Please sign in again." }, { status: 401 });

  const ip = clientIp(req);
  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: { ...PROXY_HEADERS, "Content-Type": "application/json", ...(ip ? { "X-Client-IP": ip } : {}), ...(signedIn ? { Authorization: `Bearer ${signedIn}` } : {}) },
      body: await req.text(),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "We couldn't reach the server. Try again." }, { status: 502 });
  }

  if (!upstream.ok) {
    // Pass the backend's message through. A failed login is a 401 or 403 there; show it as a plain 401.
    let message = "Something went wrong. Try again.";
    let retryAfterSeconds: number | undefined;
    let code: string | undefined;
    let email: string | undefined;
    let reason: string | undefined;
    try {
      const data = await upstream.json();
      if (data && typeof data.message === "string") message = data.message;
      if (data && typeof data.retryAfterSeconds === "number") retryAfterSeconds = data.retryAfterSeconds;
      if (data && (data.code === "EMAIL_NOT_VERIFIED" || data.code === "ACCOUNT_REJECTED")) {
        code = data.code;
        if (typeof data.email === "string") email = data.email;
        if (typeof data.reason === "string") reason = data.reason;
      }
    } catch {
      /* keep the generic message */
    }
    // The password was right, but the address was never confirmed (the page moves on to the code screen) or the application was rejected (the page says so).
    if (code) return NextResponse.json({ message, code, ...(email ? { email } : {}), ...(reason ? { reason } : {}) }, { status: 403 });
    if (action === "login" && (upstream.status === 401 || upstream.status === 403)) message = "Invalid email or password.";
    return NextResponse.json({ message, ...(retryAfterSeconds ? { retryAfterSeconds } : {}) }, { status: upstream.status });
  }

  // Sign-up with the email still to be confirmed (202): no token, no cookie. A new code was asked for (202, empty): nothing to read.
  if (upstream.status === 202) {
    const text = await upstream.text();
    return NextResponse.json(text ? JSON.parse(text) : { ok: true }, { status: 202 });
  }

  const data = (await upstream.json()) as LoginResponse;
  const user = { email: data.email, fullName: data.fullName, role: data.role };
  const res = NextResponse.json(user);
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(TOKEN_COOKIE, data.token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: MAX_AGE_SECONDS });
  res.cookies.set(USER_COOKIE, JSON.stringify(user), { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: MAX_AGE_SECONDS });
  return res;
}
