"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "@/i18n/navigation";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

const MIN = 8;

function ResetForm() {
  const t = useT();
  const token = useSearchParams().get("token") ?? "";
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next.length < MIN) return setError(`Use at least ${MIN} characters.`);
    if (next !== again) return setError("The two passwords do not match.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: next }),
      });
      if (!res.ok) {
        let message = "Something went wrong. Try again.";
        try {
          const data = await res.json();
          if (typeof data?.message === "string") message = data.message;
        } catch {
          /* keep the generic message */
        }
        throw new Error(message);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="mt-8 flex w-full max-w-[420px] flex-col gap-4 rounded-xl border border-line bg-surface p-6 sm:p-8">
        <h1 className="m-0 text-[22px] font-semibold sm:text-2xl">{t("Choose a new password")}</h1>
        <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">{t("This link is not valid any more. Ask for a new one.")}</div>
        <Link href="/forgot-password" className="py-2 text-sm">{t("Ask for a new link")}</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 flex w-full max-w-[420px] flex-col gap-4 rounded-xl border border-line bg-surface p-6 sm:p-8">
      <h1 className="m-0 text-[22px] font-semibold sm:text-2xl">{t("Choose a new password")}</h1>
      {done ? (
        <>
          <div role="status" className="rounded-lg border border-[#A9DCE9] bg-aqua-soft px-3 py-3 text-sm">{t("Your password is changed. You can sign in with it now.")}</div>
          <Link href="/login" className="py-2 text-sm font-medium">{t("Sign in")}</Link>
        </>
      ) : (
        <>
          {error && (
            <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">
              {t(error)} {/not valid/i.test(error) && <Link href="/forgot-password" className="font-medium">{t("Ask for a new link")}</Link>}
            </div>
          )}
          <Field label={t("New password")} hint={t("Use at least 8 characters.")}>
            <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
          </Field>
          <Field label={t("Repeat the new password")}>
            <Input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required />
          </Field>
          <Button type="submit" variant="primary" loading={busy}>{t("Change password")}</Button>
        </>
      )}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
