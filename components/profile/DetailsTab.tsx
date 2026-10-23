"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { api, ApiError } from "@/lib/api";
import type { DoctorProfileDto, ProfileInput, ToothNumbering } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { TOOTH_NUMBERING } from "./preferenceQuestions";

type FieldKey = "fullName" | "clinicName" | "contactNumber" | "addressLine" | "city" | "postcode" | "state" | "country";

const LABEL: Record<FieldKey, string> = {
  fullName: "Full name",
  clinicName: "Clinic name",
  contactNumber: "Contact number",
  addressLine: "Address line",
  city: "City",
  postcode: "Postcode",
  state: "State",
  country: "Country",
};

export function profileToInput(p: DoctorProfileDto): ProfileInput {
  return {
    fullName: p.fullName ?? "",
    clinicName: p.clinicName ?? "",
    contactNumber: p.contactNumber ?? "",
    addressLine: p.addressLine ?? "",
    city: p.city ?? "",
    postcode: p.postcode ?? "",
    state: p.state ?? "",
    country: p.country ?? "",
    toothNumbering: p.toothNumbering ?? "VIOLA",
  };
}

/**
 * The Details tab. Clinics and doctors share it: a doctor also has a full name, a clinic's name is its account name. Only the contact number
 * is required (Tamaz needs it before a case can be sent). The email is the login and cannot be changed. The Edit button lives in the page
 * header, so the editing flag is owned by the page.
 */
export function DetailsTab({ data, reload, editing, setEditing }: { data: DoctorProfileDto; reload: () => Promise<unknown>; editing: boolean; setEditing: (v: boolean) => void }) {
  const translate = useT();
  const toast = useToast();
  const doctor = data.role === "DOCTOR";
  const incomplete = !data.contactNumber;
  const [values, setValues] = useState<ProfileInput>(() => profileToInput(data));
  const [errors, setErrors] = useState<Partial<Record<FieldKey | "form", string>>>({});
  const [busy, setBusy] = useState(false);

  // A doctor lists their name first, a clinic its clinic name; the email follows. Phone and address take the full row on a clinic.
  const order: FieldKey[] = doctor
    ? ["fullName", "clinicName", "contactNumber", "addressLine", "city", "postcode", "state", "country"]
    : ["clinicName", "contactNumber", "addressLine", "city", "postcode", "state", "country"];
  const wide = (k: FieldKey) => k === "addressLine" || (!doctor && k === "contactNumber");
  const shown = (k: FieldKey): string => ((data as unknown as Record<string, string | null>)[k] ?? "");

  async function save() {
    const next: typeof errors = {};
    if (!values.contactNumber.trim()) next.contactNumber = "Enter a contact number";
    if (doctor && !values.fullName.trim()) next.fullName = "Enter your full name.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await api("/me/profile", { method: "PUT", body: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])) });
      await reload();
      setEditing(false);
      toast(translate("Profile saved."));
    } catch (e) {
      setErrors({ form: e instanceof ApiError ? e.message : "Something went wrong. Try again." });
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setValues(profileToInput(data));
    setErrors({});
    setEditing(false);
  }

  const numberingLabel = TOOTH_NUMBERING.find((n) => n.key === data.toothNumbering)?.label ?? "Viola";

  const row = (k: FieldKey) => {
    const label = translate(LABEL[k]);
    const required = k === "contactNumber";
    const error = errors[k];
    const ltr = k === "contactNumber" ? "ltr" : undefined;
    return (
      <div key={k} className={`flex min-w-0 flex-col gap-1.5 ${wide(k) ? "sm:col-span-2" : ""}`}>
        {editing ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {label}
              {required && <span className="font-normal text-muted"> · {translate("Required")}</span>}
            </span>
            <Input value={values[k]} onChange={(e) => setValues({ ...values, [k]: e.target.value })} invalid={!!error} dir={ltr} autoComplete={required ? "tel" : undefined} />
            {required && <span className="text-[13px] text-muted">{translate("Tamaz needs this before you can send a case.")}</span>}
            {error && <span role="alert" className="text-[13px] font-medium text-red">{translate(error)}</span>}
          </label>
        ) : (
          <>
            <span className="text-sm font-medium">{label}</span>
            <span dir={ltr} className={`flex min-h-11 items-center justify-start break-words ${shown(k) ? "" : "text-muted"}`}>{shown(k) || translate("Not set")}</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {incomplete && (
        <div className="rounded-xl border border-[#A9DCE9] bg-aqua-soft px-5 py-4">
          <div className="font-semibold">{translate("Complete your profile")}</div>
          <div className="mt-1 text-sm">{translate("Add your details so Tamaz can reach you.")}</div>
        </div>
      )}
      {errors.form && (
        <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-4 py-3 text-sm text-red">
          {translate(errors.form)}
        </div>
      )}

      <div className="grid gap-x-6 gap-y-[18px] rounded-xl border border-line bg-surface p-[18px] sm:grid-cols-2 md:p-6">
        {row(order[0])}
        {/* The email is the login: shown, never edited. */}
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-sm font-medium">{translate("Email")}</span>
          {editing ? (
            <>
              <Input value={data.email} readOnly dir="ltr" className="!bg-bg !text-muted" aria-label={translate("Email")} />
              <span className="text-[13px] text-muted">{translate("Your email can't be changed.")}</span>
            </>
          ) : (
            <span dir="ltr" className="flex min-h-11 items-center justify-start break-all">{data.email}</span>
          )}
        </div>
        {order.slice(1).map(row)}

        {!editing ? (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-medium">{translate("Tooth numbering system")}</span>
            <span className="flex min-h-11 items-center">{translate(numberingLabel)}</span>
          </div>
        ) : (
          <div role="radiogroup" aria-label={translate("Tooth numbering system")} className="flex flex-col gap-0.5 sm:col-span-2">
            <span className="mb-1 text-sm font-medium">{translate("Tooth numbering system")}</span>
            {TOOTH_NUMBERING.map((n) => (
              <label key={n.key} className="flex min-h-11 items-center gap-3">
                <input
                  type="radio"
                  name="toothNumbering"
                  checked={values.toothNumbering === n.key}
                  onChange={() => setValues({ ...values, toothNumbering: n.key as ToothNumbering })}
                  className="h-5 w-5 accent-[#1D6FE8]"
                />
                <span>{translate(n.label)}</span>
              </label>
            ))}
          </div>
        )}

        {editing && (
          <div className="flex justify-end gap-3 sm:col-span-2">
            {!incomplete && <Button variant="ghost" onClick={cancel}>{translate("Cancel")}</Button>}
            <Button variant="primary" onClick={save} loading={busy} className="px-5">{translate("Save changes")}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
