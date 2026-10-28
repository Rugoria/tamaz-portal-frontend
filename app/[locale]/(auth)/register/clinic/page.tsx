"use client";

import { useT } from "@/i18n/client";
import Link from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, friendlyError, sessionCall } from "@/lib/api";
import { homeFor } from "@/lib/routes";
import type { SessionUser, VerificationRequired } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { VerifyEmail } from "@/components/auth/VerifyEmail";

export default function ClinicSignUpPage() {
  const translate = useT();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ fullName?: string; contactNumber?: string; email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  // Set once the account is made and the code is emailed.
  const [confirming, setConfirming] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!fullName.trim()) next.fullName = "Enter your clinic name.";
    if (!contactNumber.trim()) next.contactNumber = "Enter a contact number.";
    if (!email.trim()) next.email = "Enter your email.";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const result = await sessionCall<SessionUser | VerificationRequired>("register-clinic", {
        fullName: fullName.trim(),
        contactNumber: contactNumber.trim(),
        email: email.trim(),
        password,
      });
      if ("verificationRequired" in result) {
        setConfirming(result.email);
        setBusy(false);
        return;
      }
      router.push(homeFor(result.role));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setErrors({ email: "That email's already in use." });
      else setErrors({ form: friendlyError(err, translate) });
      setBusy(false);
    }
  }

  if (confirming) return <VerifyEmail email={confirming} onUseOther={() => { setConfirming(null); setPassword(""); }} />;

  return (
    <form onSubmit={submit} noValidate className="mt-8 flex w-full max-w-[420px] flex-col gap-4 rounded-xl border border-line bg-surface p-6 sm:p-8">
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-[.8px] text-aqua">{translate("Clinics")}</div>
        <h1 className="m-0 text-[22px] font-semibold sm:text-2xl">{translate("Register your clinic")}</h1>
        <p className="mb-0 mt-2 text-sm text-muted">{translate("The tamaz team approves every new clinic before it can start. We will email you when it is done.")}</p>
      </div>
      {errors.form && (
        <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">
          {translate(errors.form)}
        </div>
      )}
      <Field label={translate("Clinic name")} error={errors.fullName}>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="organization" invalid={!!errors.fullName} />
      </Field>
      <Field label={translate("Contact number")} error={errors.contactNumber}>
        <Input type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} autoComplete="tel" invalid={!!errors.contactNumber} />
      </Field>
      <Field label={translate("Email")} error={errors.email}>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" invalid={!!errors.email} />
      </Field>
      <Field label={translate("Password")} error={errors.password} hint={translate("Use at least 8 characters.")}>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" invalid={!!errors.password} />
      </Field>
      <Button type="submit" variant="primary" loading={busy}>
        {translate("Create account")}</Button>
      <div className="text-sm text-muted">
        {translate("Already have an account? ")}<Link href="/login">{translate("Sign in")}</Link>
      </div>
    </form>
  );
}
