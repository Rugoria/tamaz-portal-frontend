"use client";

import { useT } from "@/i18n/client";
import { useApi } from "@/lib/hooks";
import type { DoctorProfileDto, OfficeDto, WorkflowDeliveryDto, WorkflowForwardDto, WorkflowPaymentDto } from "@/lib/types";
import { Input } from "@/components/ui/Field";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <h3 className="m-0 text-[17px] font-semibold">{t(title)}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <div className="grid gap-1.5 sm:grid-cols-[180px_1fr] sm:items-center">
      <span className="text-sm font-medium">{t(label)}</span>
      <div>{children}</div>
    </div>
  );
}

const SELECT = "h-11 rounded-lg border bg-surface px-3 text-[15px] disabled:bg-bg";

const oneLine = (parts: (string | null | undefined)[]) => parts.map((p) => p?.trim()).filter(Boolean).join(", ");
const EMPTY_FORWARD: WorkflowForwardDto = { source: "OTHER", recipient: "", addressLine: "", city: "", postcode: "", state: "", country: "", phone: "" };
const ADDRESS_FIELDS: { key: keyof Omit<WorkflowForwardDto, "source">; label: string; max: number }[] = [
  { key: "recipient", label: "Name", max: 255 },
  { key: "addressLine", label: "Address", max: 500 },
  { key: "city", label: "City", max: 120 },
  { key: "postcode", label: "Postcode", max: 30 },
  { key: "state", label: "State", max: 120 },
  { key: "country", label: "Country", max: 120 },
  { key: "phone", label: "Phone", max: 50 },
];

/** The address the doctor can take from: the profile address and each saved office. Each choice is a copy that fills the fields below. */
function useAddressChoices(skip: boolean) {
  const t = useT();
  const profile = useApi<DoctorProfileDto>(skip ? null : "/me/profile");
  const offices = useApi<OfficeDto[]>(skip ? null : "/me/offices");
  const choices: { key: string; label: string; fill: WorkflowForwardDto }[] = [];
  const p = profile.data;
  if (p?.addressLine) {
    const line = oneLine([p.addressLine, p.city, p.postcode, p.state, p.country]);
    choices.push({
      key: "PROFILE",
      label: `${t("My profile address")}: ${line}`,
      fill: { source: "PROFILE", recipient: p.clinicName || p.fullName, addressLine: p.addressLine, city: p.city ?? "", postcode: p.postcode ?? "", state: p.state ?? "", country: p.country ?? "", phone: p.contactNumber ?? "" },
    });
  }
  for (const o of offices.data ?? []) {
    if (!o.address) continue;
    choices.push({
      key: `OFFICE:${o.id}`,
      label: `${o.name}: ${oneLine([o.address, o.room])}`,
      fill: { source: `OFFICE:${o.id}`, recipient: o.name, addressLine: oneLine([o.address, o.room]), city: "", postcode: "", state: "", country: p?.country ?? "", phone: o.phone ?? p?.contactNumber ?? "" },
    });
  }
  return choices;
}

/** Step 3: the aligners are delivered to Tamaz, and Tamaz sends them on to the address chosen here. That address stays with Tamaz. */
export function DeliveryStep({ delivery, forwardTo, onChange, onForwardTo, disabled }: {
  delivery: WorkflowDeliveryDto;
  forwardTo: WorkflowForwardDto | null;
  onChange: (next: WorkflowDeliveryDto) => void;
  onForwardTo: (next: WorkflowForwardDto | null) => void;
  disabled: boolean;
}) {
  const t = useT();
  const set = (patch: Partial<WorkflowDeliveryDto>) => onChange({ ...delivery, ...patch });
  const choices = useAddressChoices(disabled);
  const selected = !forwardTo ? "" : choices.some((c) => c.key === forwardTo.source) ? forwardTo.source : "OTHER";
  const pick = (key: string) => {
    if (!key) return onForwardTo(null);
    if (key === "OTHER") return onForwardTo({ ...(forwardTo ?? EMPTY_FORWARD), source: "OTHER" });
    const choice = choices.find((c) => c.key === key);
    if (choice) onForwardTo(choice.fill);
  };
  const edit = (key: keyof Omit<WorkflowForwardDto, "source">, value: string) => onForwardTo({ ...(forwardTo ?? EMPTY_FORWARD), [key]: value, source: "OTHER" });
  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <Card title="Delivery">
        <Row label="Delivery address">
          <div>{t("Aligners are delivered to Tamaz")}</div>
          <div className="text-[13px] text-muted">{t("Tamaz then sends them on to the address below.")}</div>
        </Row>
        <Row label="Then send to">
          <select aria-label={t("Then send to")} disabled={disabled} value={selected} onChange={(e) => pick(e.target.value)} className={`${SELECT} w-full border-line`}>
            <option value="">{t("Choose an address")}</option>
            {choices.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            <option value="OTHER">{t("Another address")}</option>
          </select>
          {!forwardTo && !disabled && <div className="mt-1.5 text-[13px] text-pending-ink">{t("Choose where Tamaz should send the aligners after they arrive.")}</div>}
        </Row>
        {forwardTo && ADDRESS_FIELDS.map((f) => (
          <Row key={f.key} label={f.label}>
            <Input aria-label={t(f.label)} disabled={disabled} maxLength={f.max} value={forwardTo[f.key] ?? ""} onChange={(e) => edit(f.key, e.target.value)} />
          </Row>
        ))}
        <Row label="Method"><span className="inline-flex h-11 items-center rounded-lg border border-line bg-bg px-4 text-muted">{t("Set by Tamaz")}</span></Row>
        <Row label="Bonding date">
          <div className="flex flex-wrap gap-2">
            <select aria-label={t("Day")} disabled={disabled} className={`${SELECT} border-line`} value={delivery.bondingDay ?? ""} onChange={(e) => set({ bondingDay: e.target.value ? Number(e.target.value) : null })}>
              <option value="">{t("Day")}</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select aria-label={t("Month")} disabled={disabled} className={`${SELECT} border-line`} value={delivery.bondingMonth ?? ""} onChange={(e) => set({ bondingMonth: e.target.value ? Number(e.target.value) : null })}>
              <option value="">{t("Month")}</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{t(m)}</option>)}
            </select>
          </div>
        </Row>
        <Row label="Delivery notes">
          <textarea rows={3} maxLength={1000} disabled={disabled} value={delivery.notes} onChange={(e) => set({ notes: e.target.value })} aria-label={t("Delivery notes")}
            className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2.5 text-[15px] disabled:bg-bg" />
        </Row>
      </Card>
    </div>
  );
}

/** Step 4: who pays and how. Only a choice (including "Skip for now"); no amounts and no card details. */
export function PaymentStep({ payment, onChange, disabled, showErrors }: { payment: WorkflowPaymentDto; onChange: (next: WorkflowPaymentDto) => void; disabled: boolean; showErrors: boolean }) {
  const t = useT();
  const set = (patch: Partial<WorkflowPaymentDto>) => onChange({ ...payment, ...patch });
  const payerBad = showErrors && !payment.payer;
  const meansBad = showErrors && !payment.means;
  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <Card title="Payment">
        <Row label="Who pays">
          <select aria-label={t("Who pays")} aria-invalid={payerBad} disabled={disabled} value={payment.payer ?? ""} onChange={(e) => set({ payer: (e.target.value || null) as WorkflowPaymentDto["payer"] })} className={`${SELECT} w-full max-w-[320px] ${payerBad ? "border-red" : "border-line"}`}>
            <option value="">{t("Not selected")}</option>
            <option value="SKIP">{t("Skip for now")}</option>
            <option value="PATIENT">{t("Patient")}</option>
            <option value="CLINIC">{t("Clinic or doctor")}</option>
          </select>
          {payerBad && <div role="alert" className="mt-1 text-[13px] font-medium text-red">{t("Choose one")}</div>}
        </Row>
        <Row label="How">
          <select aria-label={t("How")} aria-invalid={meansBad} disabled={disabled} value={payment.means ?? ""} onChange={(e) => set({ means: (e.target.value || null) as WorkflowPaymentDto["means"] })} className={`${SELECT} w-full max-w-[320px] ${meansBad ? "border-red" : "border-line"}`}>
            <option value="">{t("Not selected")}</option>
            <option value="CASH">{t("Cash")}</option>
            <option value="TRANSFER">{t("Bank transfer")}</option>
            <option value="CARD">{t("Card")}</option>
            <option value="SKIP">{t("Skip for now")}</option>
          </select>
          {meansBad && <div role="alert" className="mt-1 text-[13px] font-medium text-red">{t("Choose one")}</div>}
        </Row>
        <p className="m-0 text-sm text-muted">{t("Payment receipts are made out to the person or company you choose.")}</p>
      </Card>
    </div>
  );
}
