"use client";

import { useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import Link from "@/i18n/navigation";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

export default function ForgotPasswordPage() {
  const t = useT();
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale }),
      });
      if (res.status === 429) throw new Error("Too many attempts. Try again later.");
      if (!res.ok) throw new Error("failed");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error && err.message !== "failed" ? err.message : "We couldn't send that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 flex w-full max-w-[420px] flex-col gap-4 rounded-xl border border-line bg-surface p-6 sm:p-8">
      <h1 className="m-0 text-[22px] font-semibold sm:text-2xl">{t("Forgot your password?")}</h1>
      {sent ? (
        <>
          <div role="status" className="rounded-lg border border-[#A9DCE9] bg-aqua-soft px-3 py-3 text-sm">
            {t("If that email has an account, a link to choose a new password is on its way. It works once and for an hour.")}
          </div>
          <Link href="/login" className="py-2 text-sm">{t("Back to sign in")}</Link>
        </>
      ) : (
        <>
          <p className="m-0 text-sm text-muted">{t("Enter the email of your account and we will send you a link to choose a new password.")}</p>
          {error && <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">{t(error)}</div>}
          <Field label={t("Email")}>
            <Input type="email" autoComplete="username" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Button type="submit" variant="primary" loading={busy}>{t("Send the link")}</Button>
          <Link href="/login" className="py-2 text-sm">{t("Back to sign in")}</Link>
        </>
      )}
    </form>
  );
}
