"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import { useT } from "@/i18n/client";
import { friendlyError, sessionCall } from "@/lib/api";
import { homeFor } from "@/lib/routes";
import type { SessionUser } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

const WAIT_SECONDS = 60;

/**
 * Shown after sign-up (and after a sign-in with an address that was never confirmed): the person enters the 6-digit code that was emailed.
 * The right code confirms the address and signs them in. "Send a new code" is available again after a minute, like the backend's own wait.
 */
export function VerifyEmail({ email, onUseOther }: { email: string; onUseOther: () => void }) {
  const translate = useT();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(WAIT_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => setWait((w) => (w > 0 ? w - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setNote(null);
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const user = await sessionCall<SessionUser>("verify-email", { email, code });
      router.push(homeFor(user.role));
      router.refresh();
    } catch (err) {
      setError(friendlyError(err, translate));
      setBusy(false);
    }
  }

  async function again() {
    setError(null);
    setNote(null);
    try {
      await sessionCall("resend-code", { email });
      setNote("We sent you a new code.");
      setWait(WAIT_SECONDS);
    } catch (err) {
      setError(friendlyError(err, translate));
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 flex w-full max-w-[420px] flex-col gap-4 rounded-xl border border-line bg-surface p-6 sm:p-8">
      <h1 className="m-0 text-[22px] font-semibold sm:text-2xl">{translate("Confirm your email")}</h1>
      <p className="m-0 text-sm text-muted">{translate("We sent a 6-digit code to {email}. Enter it below to finish.", { email })}</p>
      {error && (
        <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">
          {translate(error)}
        </div>
      )}
      {note && (
        <div role="status" className="rounded-lg border border-line bg-bg px-3 py-2.5 text-sm">
          {translate(note)}
        </div>
      )}
      <Field label={translate("6-digit code")}>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          invalid={!!error}
          className="text-center text-xl tracking-[6px]"
        />
      </Field>
      <Button type="submit" variant="primary" loading={busy}>
        {translate("Confirm")}</Button>
      <div className="flex flex-col gap-1 text-sm">
        <span className="text-muted">{translate("Didn't get it? Check your spam folder, or ask for a new code.")}</span>
        <button type="button" onClick={() => void again()} disabled={wait > 0} className="min-h-11 text-start font-medium underline disabled:text-muted disabled:no-underline">
          {wait > 0 ? translate("You can ask for a new code in {seconds} seconds.", { seconds: wait }) : translate("Send a new code")}
        </button>
        <button type="button" onClick={onUseOther} className="min-h-11 text-start underline">
          {translate("Use a different email")}</button>
      </div>
    </form>
  );
}
