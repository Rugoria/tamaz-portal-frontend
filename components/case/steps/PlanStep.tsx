"use client";

import { useT } from "@/i18n/client";
import type { WorkflowPlanDto } from "@/lib/types";
import { PLAN_MIN } from "@/components/case/steps/useWorkflowDraft";

const ROWS: { key: string; label: string }[] = [
  { key: "RIGHT_MOLARS", label: "Right molars" },
  { key: "RIGHT_CANINE", label: "Right canine" },
  { key: "LEFT_MOLARS", label: "Left molars" },
  { key: "LEFT_CANINE", label: "Left canine" },
];
const CLASSES = ["I", "II", "III"];

/** Upper row UR8..UR1 then UL1..UL8, lower row LR8..LR1 then LL1..LL8. */
const toothRow = (jaw: "U" | "L") => [...[8, 7, 6, 5, 4, 3, 2, 1].map((n) => `${jaw}R${n}`), ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${jaw}L${n}`)];
const UPPER = toothRow("U");
const LOWER = toothRow("L");

function Section({ n, title, children, optional }: { n: number; title: string; children: React.ReactNode; optional?: boolean }) {
  const t = useT();
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="m-0 text-[17px] font-semibold">{n}. {t(title)}</h3>
        <span className="text-[13px] text-muted">{t(optional ? "Optional" : "Required")}</span>
      </div>
      {children}
    </section>
  );
}

/** Step 2: the doctor's own treatment plan. Only the text is needed to continue. */
export function PlanStep({ plan, onChange, disabled, showErrors }: { plan: WorkflowPlanDto; onChange: (next: WorkflowPlanDto) => void; disabled: boolean; showErrors: boolean }) {
  const t = useT();
  const len = plan.text.trim().length;
  const tooShort = showErrors && len < PLAN_MIN;
  const set = (patch: Partial<WorkflowPlanDto>) => onChange({ ...plan, ...patch });
  const toggleTooth = (tooth: string) => set({ extraction: plan.extraction.includes(tooth) ? plan.extraction.filter((x) => x !== tooth) : [...plan.extraction, tooth] });
  const setWidth = (tooth: string, v: string) => {
    const n = Math.max(0, Math.min(50, Math.round(Number(v) || 0)));
    const widths = { ...plan.widths };
    if (n > 0) widths[tooth] = n;
    else delete widths[tooth];
    set({ widths });
  };

  const radio = (name: string, value: string, current: string, label: string, hint?: string, nested?: boolean) => (
    <label className={`flex min-h-11 cursor-pointer items-start gap-2.5 py-2 ${nested ? "ms-7" : ""}`}>
      <input type="radio" name={name} value={value} checked={current === value} disabled={disabled} onChange={() => set(name === "aligners" ? { aligners: value as WorkflowPlanDto["aligners"] } : { trimming: value as WorkflowPlanDto["trimming"] })} className="mt-1 h-4 w-4 accent-[#1456B8]" />
      <span>
        <span className={current === value ? "font-semibold" : ""}>{t(label)}</span>
        {hint && <span className="block text-[13px] text-muted">{t(hint)}</span>}
      </span>
    </label>
  );

  const tooth = (code: string) => {
    const on = plan.extraction.includes(code);
    return (
      <button key={code} type="button" disabled={disabled} aria-pressed={on} onClick={() => toggleTooth(code)}
        className="h-11 min-w-11 rounded-lg border px-1 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed"
        style={{ background: on ? "#1D6FE8" : "#fff", color: on ? "#fff" : "#0B1F3A", borderColor: on ? "#1D6FE8" : "#D3DFEC", fontWeight: on ? 600 : 400 }}>
        {on ? "✓ " : ""}{code}
      </button>
    );
  };

  const widthCell = (code: string) => (
    <label key={code} className="flex flex-col items-center gap-1 text-[11px] text-muted">
      {code}
      <input type="number" inputMode="numeric" min={0} max={50} disabled={disabled} value={plan.widths[code] ?? 0} onChange={(e) => setWidth(code, e.target.value)} aria-label={`${t("Width in mm")} ${code}`}
        className="h-10 w-11 rounded-md border border-line bg-surface px-1 text-center text-sm text-ink disabled:bg-bg" />
    </label>
  );

  return (
    <div className="flex flex-col gap-4">
      <Section n={1} title="Treatment plan">
        <div className="flex items-center justify-between text-[13px]">
          <label htmlFor="plan-text" className="font-medium">{t("Describe the plan in as much detail as you can, in simple sentences. Say which occlusion class you want and any extractions or prosthesis.")}</label>
        </div>
        <textarea id="plan-text" rows={5} value={plan.text} disabled={disabled} onChange={(e) => set({ text: e.target.value })} aria-invalid={tooShort} aria-describedby="plan-count"
          className={`w-full resize-y rounded-lg border bg-surface px-3 py-2.5 text-[15px] disabled:bg-bg ${tooShort ? "border-red" : "border-line"}`} />
        <div id="plan-count" className="flex items-center justify-between text-[13px]">
          <span className={tooShort ? "font-medium text-red" : "text-transparent"} role={tooShort ? "alert" : undefined}>{t("Please write at least 10 characters")}</span>
          <span className="text-muted">{t("{n} characters", { n: len })}</span>
        </div>
      </Section>

      <Section n={2} title="Final class desired" optional>
        <div className="flex flex-col gap-2">
          {ROWS.map((r) => (
            <div key={r.key} className="flex flex-wrap items-center gap-3">
              <span className="w-32 text-sm">{t(r.label)}</span>
              <div role="group" aria-label={t(r.label)} className="flex gap-2">
                {CLASSES.map((c) => {
                  const on = plan.classes[r.key] === c;
                  return (
                    <button key={c} type="button" disabled={disabled} aria-pressed={on} onClick={() => set({ classes: { ...plan.classes, [r.key]: on ? "" : c } })}
                      className="h-11 min-w-[88px] rounded-lg border px-3 text-sm disabled:cursor-not-allowed"
                      style={{ background: on ? "#E3EDFC" : "#fff", color: on ? "#1456B8" : "#0B1F3A", borderColor: on ? "#1D6FE8" : "#D3DFEC", fontWeight: on ? 600 : 400 }}>
                      {on ? "✓ " : ""}{t("Class {c}", { c })}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section n={3} title="Extraction" optional>
        <div className="text-[13px] text-muted">{t("Tap a tooth to mark it")}</div>
        <div className="overflow-x-auto">
          <div className="flex min-w-[820px] flex-col gap-2">
            {[UPPER, LOWER].map((row, i) => <div key={i} className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>{row.map(tooth)}</div>)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-accent" />{t("Marked")}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-line bg-surface" />{t("Not marked")}</span>
        </div>
        <div className="text-sm"><span className="text-muted">{t("Marked teeth:")} </span><b>{plan.extraction.length ? [...plan.extraction].sort().join(", ") : "—"}</b></div>
      </Section>

      <Section n={4} title="Tooth eruption, bridge or implant" optional>
        <div className="text-[13px] text-muted">{t("Width in mm under each tooth")}</div>
        <div className="overflow-x-auto">
          <div className="flex min-w-[820px] flex-col gap-2">
            {[UPPER, LOWER].map((row, i) => <div key={i} className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>{row.map(widthCell)}</div>)}
          </div>
        </div>
      </Section>

      <Section n={5} title="Passive or active aligners" optional>
        <div role="radiogroup" aria-label={t("Passive or active aligners")}>
          <div className="py-2 font-medium">{t("Both jaws")}</div>
          {radio("aligners", "BOTH_PASSIVE", plan.aligners, "Passive", "Same number of upper and lower aligners", true)}
          {radio("aligners", "BOTH_ACTIVE", plan.aligners, "Active", "The numbers may differ", true)}
          {radio("aligners", "UPPER_ONLY", plan.aligners, "Upper jaw only")}
          {radio("aligners", "LOWER_ONLY", plan.aligners, "Lower jaw only")}
        </div>
      </Section>

      <Section n={6} title="Aligner trimming" optional>
        <div role="radiogroup" aria-label={t("Aligner trimming")}>
          {radio("trimming", "STANDARD", plan.trimming, "Standard (soft and hard tissue border)")}
          {radio("trimming", "GUM", plan.trimming, "Trimming including 2 to 3 mm of gum tissue")}
        </div>
      </Section>
    </div>
  );
}
