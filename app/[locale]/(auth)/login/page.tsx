"use client";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useState, type FormEvent } from "react";
import { friendlyError, sessionCall } from "@/lib/api";
import { homeFor } from "@/lib/routes";
import type { SessionUser } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

export default function LoginPage() {
  const translate = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await sessionCall<SessionUser>("login", { email: email.trim(), password });
      router.push(homeFor(user.role));
      router.refresh();
    } catch (err) {
      setError(friendlyError(err, translate));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 flex w-full max-w-[420px] flex-col gap-4 rounded-xl border border-line bg-surface p-6 sm:p-8">
      <h1 className="m-0 text-[22px] font-semibold sm:text-2xl">{translate("Sign in")}</h1>
      {error && (
        <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">
          {error}
        </div>
      )}
      <Field label={translate("Email")}>
        <Input type="email" autoComplete="username" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!error} required />
      </Field>
      <Field label={translate("Password")}>
        <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!error} required />
      </Field>
      <Button type="submit" variant="primary" loading={busy}>
        {translate("Sign in")}</Button>
      <div className="flex flex-col text-sm">
        <Link href="/forgot-password" className="py-2">
          {translate("Forgot your password?")}</Link>
        <Link href="/register" className="py-2">
          {translate("Create a patient account")}</Link>
        <Link href="/register/doctor" className="py-2">
          {translate("I&apos;m a doctor, register")}</Link>
      </div>
      <div className="border-t border-line pt-4 text-sm text-muted">{translate("Clinics: your account is created by the tamaz team.")}</div>
    </form>
  );
}
