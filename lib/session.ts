import "server-only";
import { cookies } from "next/headers";
import { redirect } from "@/i18n/server";
import { homeFor } from "./routes";
import type { Role, SessionUser } from "./types";

export const TOKEN_COOKIE = "tz_token";
export const USER_COOKIE = "tz_user";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = jar.get(USER_COOKIE)?.value;
  if (!raw || !jar.get(TOKEN_COOKIE)?.value) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

/** For layouts: signed in with one of the allowed roles, otherwise send them where they belong. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSession();
  if (!user) return redirect("/login");
  if (!roles.includes(user.role)) return redirect(homeFor(user.role));
  return user;
}
