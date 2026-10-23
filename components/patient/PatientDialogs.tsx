"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { api, ApiError } from "@/lib/api";
import type { CaseDto, PatientDetailsDto } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";

/** Two or more choices shown as buttons; one can be picked (and picked again to clear). */
function Choice({ options, value, onChange, label }: { options: { value: string; label: string }[]; value: string | null; onChange: (v: string | null) => void; label: string }) {
  const t = useT();
  return (
    <div role="group" aria-label={t(label)} className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(value === o.value ? null : o.value)}
          className={`flex h-11 flex-1 items-center justify-center rounded-lg border px-2 ${value === o.value ? "border-accent bg-surface-2 font-semibold text-accent" : "border-line bg-surface text-muted"}`}
        >
          {t(o.label)}
        </button>
      ))}
    </div>
  );
}

interface Form {
  officeId: string;
  dateOfBirth: string;
  gender: string | null;
  email: string;
  phone: string;
  address: string;
  treatmentStatus: string;
  responsibleDoctor: string;
}

const EMPTY: Form = { officeId: "", dateOfBirth: "", gender: null, email: "", phone: "", address: "", treatmentStatus: "IN_TREATMENT", responsibleDoctor: "" };

function fromDto(d: PatientDetailsDto): Form {
  return {
    officeId: d.officeId ?? "", dateOfBirth: d.dateOfBirth ?? "", gender: d.gender, email: d.email ?? "", phone: d.phone ?? "",
    address: d.address ?? "", treatmentStatus: d.treatmentStatus ?? "IN_TREATMENT", responsibleDoctor: d.responsibleDoctor ?? "",
  };
}

const toBody = (f: Form) => ({
  officeId: f.officeId, dateOfBirth: f.dateOfBirth || null, gender: f.gender, email: f.email, phone: f.phone, address: f.address,
  treatmentStatus: f.treatmentStatus, responsibleDoctor: f.responsibleDoctor,
});

/** The patient details a clinic or doctor can keep. The responsible doctor is for clinics (an independent doctor is their own). */
function DetailsFields({ form, set, role, withOfficeId }: { form: Form; set: (patch: Partial<Form>) => void; role: string; withOfficeId: boolean }) {
  const t = useT();
  const [more, setMore] = useState(!!(form.email || form.phone || form.address));
  return (
    <>
      {withOfficeId && (
        <Field label={t("Office ID")} hint={t("Your own number for this patient. It can stand in for the name.")}>
          <Input value={form.officeId} maxLength={60} onChange={(e) => set({ officeId: e.target.value })} />
        </Field>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("Date of birth")}>
          <Input type="date" value={form.dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set({ dateOfBirth: e.target.value })} />
        </Field>
        <Field label={t("Gender")}>
          <Choice label="Gender" options={[{ value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }]} value={form.gender} onChange={(v) => set({ gender: v })} />
        </Field>
      </div>
      {role === "clinic" && (
        <Field label={t("Responsible doctor")} hint={t("The doctor at your clinic who looks after this patient.")}>
          <Input value={form.responsibleDoctor} maxLength={200} onChange={(e) => set({ responsibleDoctor: e.target.value })} />
        </Field>
      )}
      <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="flex min-h-11 items-center gap-1.5 text-start font-medium text-accent">
        {more ? t("Less ˄") : t("More ˅")}
      </button>
      {more && (
        <div className="grid gap-3 rounded-lg bg-bg p-4 sm:grid-cols-2">
          <Field label={t("Email")}>
            <Input type="email" value={form.email} maxLength={255} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label={t("Phone")}>
            <Input type="tel" value={form.phone} maxLength={40} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <Field label={t("Address")} className="sm:col-span-2">
            <Input value={form.address} maxLength={500} onChange={(e) => set({ address: e.target.value })} />
          </Field>
          <Field label={t("Treatment status")} className="sm:col-span-2">
            <Choice label="Treatment status" options={[{ value: "IN_TREATMENT", label: "In treatment" }, { value: "COMPLETED", label: "Treatment completed" }]} value={form.treatmentStatus} onChange={(v) => set({ treatmentStatus: v ?? "IN_TREATMENT" })} />
          </Field>
        </div>
      )}
    </>
  );
}

/** Creating a patient starts their first case (a patient is the name on a clinic's cases). */
export function NewPatientDialog({ role, onClose, onCreated }: { role: string; onClose: () => void; onCreated: (c: CaseDto) => void }) {
  const t = useT();
  const [last, setLast] = useState("");
  const [first, setFirst] = useState("");
  const [middle, setMiddle] = useState("");
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function create() {
    const fullName = [first, middle, last].map((s) => s.trim()).filter(Boolean).join(" ");
    if (!fullName && !form.officeId.trim()) {
      setNameError(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await api<CaseDto>("/cases", { method: "POST", body: { patientFullName: fullName, patient: toBody(form) } });
      onCreated(created);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog title={t("New patient")} onClose={onClose} width={620}>
      <p className="m-0 text-sm text-muted">{t("Creating a patient starts their first case.")}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("Last name")} error={nameError ? "Enter a name or an office ID." : null}>
          <Input value={last} onChange={(e) => (setLast(e.target.value), setNameError(false))} invalid={nameError} />
        </Field>
        <Field label={t("First name")}>
          <Input value={first} onChange={(e) => (setFirst(e.target.value), setNameError(false))} />
        </Field>
        <Field label={t("Middle name")}>
          <Input value={middle} onChange={(e) => setMiddle(e.target.value)} />
        </Field>
      </div>
      <DetailsFields form={form} set={(p) => setForm((f) => ({ ...f, ...p }))} role={role} withOfficeId />
      {error && <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">{t(error)}</div>}
      <DialogActions>
        <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="primary" onClick={create} loading={busy} className="px-[22px]">{t("Create")}</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Change what is recorded about an existing patient. */
export function EditPatientDialog({ patientKey, name, role, current, onClose, onSaved }: { patientKey: string; name: string; role: string; current: PatientDetailsDto; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [form, setForm] = useState<Form>(fromDto(current));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(`/patients/details?key=${encodeURIComponent(patientKey)}`, { method: "PUT", body: toBody(form) });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog title={t("Patient details")} onClose={onClose} width={620}>
      <div className="text-lg font-semibold">{name}</div>
      <DetailsFields form={form} set={(p) => setForm((f) => ({ ...f, ...p }))} role={role} withOfficeId />
      {error && <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">{t(error)}</div>}
      <DialogActions>
        <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="primary" onClick={save} loading={busy} className="px-[22px]">{t("Save")}</Button>
      </DialogActions>
    </Dialog>
  );
}
