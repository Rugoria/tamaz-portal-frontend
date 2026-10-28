"use client";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, friendlyError, sessionCall } from "@/lib/api";
import { homeFor } from "@/lib/routes";
import type { SessionUser, VerificationRequired } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { VerifyEmail } from "@/components/auth/VerifyEmail";

type Values = {
  email: string;
  password: string;
  fullName: string;
  clinicName: string;
  contactNumber: string;
  addressLine: string;
  city: string;
  postcode: string;
  state: string;
  country: string;
};

const EMPTY: Values = {
  email: "", password: "", fullName: "", clinicName: "", contactNumber: "",
  addressLine: "", city: "", postcode: "", state: "", country: "",
};

const REQUIRED: Record<Exclude<keyof Values, "password">, string> = {
  email: "Enter your email.",
  fullName: "Enter your full name.",
  clinicName: "Enter your clinic name.",
  contactNumber: "Enter a contact number.",
  addressLine: "Enter your address line.",
  city: "Enter your city.",
  postcode: "Enter your postcode.",
  state: "Enter your state.",
  country: "Enter your country.",
};

export default function DoctorRegistrationPage() {
  const translate = useT();
  const router = useRouter();
  const [v, setV] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Values | "form", string>>>({});
  const [busy, setBusy] = useState(false);
  // Set once the account is made and the code is emailed.
  const [confirming, setConfirming] = useState<string | null>(null);

  const set = (k: keyof Values) => (e: { target: { value: string } }) => setV((cur) => ({ ...cur, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    (Object.keys(REQUIRED) as (keyof typeof REQUIRED)[]).forEach((k) => {
      if (!v[k].trim()) next[k] = REQUIRED[k];
    });
    if (v.password.length < 8) next.password = "Use at least 8 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const trimmed = Object.fromEntries(Object.entries(v).map(([k, val]) => [k, k === "password" ? val : val.trim()]));
      const result = await sessionCall<SessionUser | VerificationRequired>("register-doctor", trimmed);
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

  const f = (k: keyof Values, label: string, extra: { type?: string; auto?: string; placeholder?: string; hint?: string; className?: string } = {}) => (
    <Field label={label} error={errors[k]} hint={extra.hint} className={extra.className}>
      <Input
        type={extra.type}
        autoComplete={extra.auto}
        placeholder={extra.placeholder}
        value={v[k]}
        onChange={set(k)}
        invalid={!!errors[k]}
      />
    </Field>
  );

  if (confirming) return <VerifyEmail email={confirming} onUseOther={() => { setConfirming(null); setV((cur) => ({ ...cur, password: "" })); }} />;

  return (
    <form onSubmit={submit} noValidate className="mt-7 flex w-full max-w-[720px] flex-col gap-4">
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-[.8px] text-aqua">{translate("Doctors")}</div>
        <h1 className="m-0 text-[22px] font-semibold sm:text-2xl">{translate("Register as a doctor")}</h1>
      </div>
      {errors.form && (
        <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">
          {translate(errors.form)}
        </div>
      )}
      <section className="grid gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2 sm:p-6">
        <div className="font-semibold sm:col-span-2">{translate("Account")}</div>
        {f("email", "Email", { type: "email", auto: "email" })}
        {f("password", "Password", { type: "password", auto: "new-password", hint: translate("Use at least 8 characters.") })}
      </section>
      <section className="grid gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2 sm:p-6">
        <div className="font-semibold sm:col-span-2">{translate("About you")}</div>
        {f("fullName", "Full name", { auto: "name" })}
        {f("clinicName", "Clinic name")}
        {f("contactNumber", "Contact number", { auto: "tel", placeholder: "+44 20 7946 0123" })}
      </section>
      <section className="grid gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2 sm:p-6">
        <div className="font-semibold sm:col-span-2">{translate("Address")}</div>
        {f("addressLine", "Address line", { auto: "address-line1", className: "sm:col-span-2" })}
        {f("city", "City", { auto: "address-level2" })}
        {f("postcode", "Postcode", { auto: "postal-code" })}
        {f("state", "State", { auto: "address-level1" })}
        {f("country", "Country", { auto: "country-name" })}
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">{translate("All fields are required.")}</span>
        <Button type="submit" variant="primary" loading={busy} className="px-6">
          {translate("Create account")}</Button>
      </div>
      <div className="text-sm text-muted">
        {translate("Already have an account? ")}<Link href="/login">{translate("Sign in")}</Link>
      </div>
    </form>
  );
}
