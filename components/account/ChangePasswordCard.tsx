"use client";

import { useState, type FormEvent } from "react";
import { useT } from "@/i18n/client";
import { sessionCall, ApiError } from "@/lib/api";
import type { SessionUser } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

const MIN = 8;

/** Change your own password. Signing in elsewhere stops working; this browser stays signed in with a fresh token. */
export function ChangePasswordCard() {
  const t = useT();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string; again?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (!current) found.current = "Enter your current password.";
    if (next.length < MIN) found.next = `Use at least ${MIN} characters.`;
    else if (next === current) found.next = "Choose a password you have not been using.";
    if (again !== next) found.again = "The two passwords do not match.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await sessionCall<SessionUser>("change-password", { currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setAgain("");
      toast(t("Password changed. Other devices were signed out."));
    } catch (err) {
      const message = err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong. Try again.";
      if (/current password/i.test(message)) setErrors({ current: message });
      else setErrors({ form: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex max-w-[480px] flex-col gap-4 rounded-xl border border-line bg-surface p-6" aria-labelledby="change-password-title">
      <h2 id="change-password-title" className="m-0 text-lg font-semibold">{t("Change password")}</h2>
      <p className="m-0 text-sm text-muted">{t("You will stay signed in here. Every other device is signed out.")}</p>
      {errors.form && <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">{t(errors.form)}</div>}
      <Field label={t("Current password")} error={errors.current}>
        <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} invalid={!!errors.current} />
      </Field>
      <Field label={t("New password")} error={errors.next} hint={t("Use at least 8 characters.")}>
        <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} invalid={!!errors.next} />
      </Field>
      <Field label={t("Repeat the new password")} error={errors.again}>
        <Input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} invalid={!!errors.again} />
      </Field>
      <div>
        <Button type="submit" variant="primary" loading={busy}>{t("Change password")}</Button>
      </div>
    </form>
  );
}

export function AccountPage() {
  const t = useT();
  return (
    <div className="flex w-full flex-col gap-5">
      <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{t("Account")}</h1>
      <ChangePasswordCard />
    </div>
  );
}
