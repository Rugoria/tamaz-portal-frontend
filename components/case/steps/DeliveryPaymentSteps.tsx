"use client";

import { useT } from "@/i18n/client";
import type { WorkflowDeliveryDto, WorkflowPaymentDto } from "@/lib/types";

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

/** Step 3: where the aligners go. The aligners go to Tamaz (the company address); what happens after that is not decided. */
export function DeliveryStep({ delivery, onChange, disabled }: { delivery: WorkflowDeliveryDto; onChange: (next: WorkflowDeliveryDto) => void; disabled: boolean }) {
  const t = useT();
  const set = (patch: Partial<WorkflowDeliveryDto>) => onChange({ ...delivery, ...patch });
  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <Card title="Delivery">
        <Row label="Delivery address">
          <div>{t("Aligners are delivered to Tamaz")}</div>
          <div className="text-[13px] text-muted">{t("Where they go after that is not decided yet.")}</div>
        </Row>
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
