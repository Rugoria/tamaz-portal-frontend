import { redirect } from "@/i18n/server";
import { getSession } from "@/lib/session";
import { homeFor } from "@/lib/routes";

export default async function Root() {
  const user = await getSession();
  return redirect(user ? homeFor(user.role) : "/login");
}
