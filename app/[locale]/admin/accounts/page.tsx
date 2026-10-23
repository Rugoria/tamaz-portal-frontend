"use client";
import {useT} from "@/i18n/client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";

import { GridScreen } from "@/components/grid/GridScreen";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";

type Kind = "clinics" | "doctors" | "customers";

const GRID: Record<Kind, string> = { clinics: "ADMIN_CLINICS", doctors: "ADMIN_DOCTORS", customers: "ADMIN_PATIENT_ACCOUNTS" };

const KIND: Record<Kind, { tab: string; create: string; noun: string }> = {
  clinics: { tab: "Clinics", create: "Create clinic", noun: "clinic" },
  doctors: { tab: "Doctors", create: "Create doctor", noun: "doctor" },
  customers: { tab: "Patient accounts", create: "Create patient", noun: "patient" },
};

export default function AccountsPage() {
  const translate = useT();
  const [kind, setKind] = useState<Kind>("clinics");
  const [dialog, setDialog] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const k = KIND[kind];

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("Accounts")}</h1>
        <Button variant="primary" onClick={() => setDialog(true)} className="px-5">
          {translate(k.create)}
        </Button>
      </div>
      <Tabs tabs={(Object.keys(KIND) as Kind[]).map((key) => ({ key, label: KIND[key].tab }))} active={kind} onChange={(key) => setKind(key)} />
      <GridScreen key={kind} grid={GRID[kind]} rowsKey={reloadKey} emptyTitle={translate("No {v0}s yet.", { v0: translate(k.noun) })} emptyText={translate("Create the first {v0} account.", { v0: translate(k.noun) })} />

      {dialog && (
        <CreateDialog
          kind={kind}
          onClose={() => setDialog(false)}
          onCreated={() => {
            setDialog(false);
            setReloadKey((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}

function CreateDialog({ kind, onClose, onCreated }: { kind: Kind; onClose: () => void; onCreated: () => void }) {
  const translate = useT();
  const toast = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [contact, setContact] = useState("");
  const clinic = kind === "clinics";
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; contact?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  async function create() {
    const next: typeof errors = {};
    if (!fullName.trim()) next.fullName = "Enter a full name.";
    if (!email.trim()) next.email = "Enter an email.";
    if (clinic && !contact.trim()) next.contact = "Enter a contact number";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await api(`/admin/${kind}`, { method: "POST", body: { fullName: fullName.trim(), email: email.trim(), password, ...(clinic ? { contactNumber: contact.trim() } : {}) } });
      toast(translate("Account created."));
      onCreated();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setErrors({ email: "That email's already in use." });
      else setErrors({ form: e instanceof ApiError ? e.message : "Something went wrong. Try again." });
      setBusy(false);
    }
  }

  return (
    <Dialog title={KIND[kind].create} onClose={onClose}>
      {errors.form && (
        <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">
          {translate(errors.form)}
        </div>
      )}
      <Field label={translate("Full name")} error={errors.fullName}>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} invalid={!!errors.fullName} />
      </Field>
      <Field label={translate("Email")} error={errors.email}>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} />
      </Field>
      {clinic && (
        <Field label={translate("Contact number")} error={errors.contact} hint={translate("Required")}>
          <Input dir="ltr" value={contact} onChange={(e) => setContact(e.target.value)} invalid={!!errors.contact} autoComplete="off" className="text-start" />
        </Field>
      )}
      <Field label={translate("Password")} error={errors.password} hint={translate("Use at least 8 characters.")}>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!errors.password} autoComplete="new-password" />
      </Field>
      <DialogActions>
        <Button variant="ghost" onClick={onClose}>
          {translate("Cancel")}</Button>
        <Button variant="primary" onClick={create} loading={busy} className="px-[22px]">
          {translate("Create account")}</Button>
      </DialogActions>
    </Dialog>
  );
}
