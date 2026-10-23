"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import type { ColumnDef, FilterConfig } from "@/lib/grid/engine";

/** The value control for one filter, by the field's type: text, status choices, yes/no, date range, number range. */
export function FilterEditor<T>({ def, initial, onApply, onCancel }: { def: ColumnDef<T>; initial?: FilterConfig; onApply: (f: FilterConfig) => void; onCancel: () => void }) {
  const t = useT();
  const [text, setText] = useState(initial?.op === "contains" ? String(initial.value ?? "") : "");
  const [picked, setPicked] = useState<string[]>(initial?.op === "in" ? ((initial.value as string[]) ?? []) : []);
  const [yn, setYn] = useState<"any" | "yes" | "no">(initial?.op === "is" ? (initial.value ? "yes" : "no") : "any");
  const initDays = initial?.op === "lastDays" ? String(initial.value) : initial?.op === "range" && def.type === "DATE" ? "custom" : "30";
  const [days, setDays] = useState<string>(initDays);
  const initRange = (initial?.op === "range" ? initial.value : {}) as { from?: string; to?: string; min?: number | null; max?: number | null };
  const [from, setFrom] = useState(initRange.from ?? "");
  const [to, setTo] = useState(initRange.to ?? "");
  const [min, setMin] = useState(initRange.min != null ? String(initRange.min) : "");
  const [max, setMax] = useState(initRange.max != null ? String(initRange.max) : "");

  const apply = () => {
    const key = def.key;
    if (def.type === "TEXT") {
      if (!text.trim()) return onCancel();
      onApply({ key, op: "contains", value: text.trim() });
    } else if (def.type === "STATUS") {
      if (picked.length === 0) return onCancel();
      onApply({ key, op: "in", value: picked });
    } else if (def.type === "BOOLEAN") {
      if (yn === "any") return onCancel();
      onApply({ key, op: "is", value: yn === "yes" });
    } else if (def.type === "DATE") {
      if (days === "custom") {
        if (!from && !to) return onCancel();
        onApply({ key, op: "range", value: { from: from || undefined, to: to || undefined } });
      } else onApply({ key, op: "lastDays", value: Number(days) });
    } else {
      if (min === "" && max === "") return onCancel();
      onApply({ key, op: "range", value: { min: min === "" ? null : Number(min), max: max === "" ? null : Number(max) } });
    }
  };

  const radio = (name: string, value: string, current: string, set: (v: string) => void, label: string) => (
    <label className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2 hover:bg-bg">
      <input type="radio" name={name} checked={current === value} onChange={() => set(value)} className="h-4 w-4 accent-[#1D6FE8]" />
      {label}
    </label>
  );

  return (
    <div className="flex flex-col gap-2 p-1">
      <div className="px-1 text-sm font-semibold">{t(def.label)}</div>
      {def.type === "TEXT" && <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apply()} placeholder={t("Contains…")} aria-label={t(def.label)} />}
      {def.type === "STATUS" && (
        <div className="flex max-h-60 flex-col overflow-y-auto">
          {(def.options ?? []).map((o) => (
            <label key={o.value} className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2 hover:bg-bg">
              <input type="checkbox" checked={picked.includes(o.value)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, o.value] : p.filter((x) => x !== o.value)))} className="h-4 w-4 accent-[#1D6FE8]" />
              {t(o.label)}
            </label>
          ))}
        </div>
      )}
      {def.type === "BOOLEAN" && (
        <div role="radiogroup" aria-label={t(def.label)}>
          {radio("yn", "any", yn, (v) => setYn(v as "any"), t("Any"))}
          {radio("yn", "yes", yn, (v) => setYn(v as "yes"), t("Yes"))}
          {radio("yn", "no", yn, (v) => setYn(v as "no"), t("No"))}
        </div>
      )}
      {def.type === "DATE" && (
        <div role="radiogroup" aria-label={t(def.label)}>
          {["7", "30", "90"].map((d) => radio("days", d, days, setDays, t("Last {n} days", { n: Number(d) })))}
          {radio("days", "custom", days, setDays, t("Custom range"))}
          {days === "custom" && (
            <div className="mt-1 flex flex-col gap-2 px-2">
              <label className="text-[13px] text-muted">{t("From")}<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
              <label className="text-[13px] text-muted">{t("To")}<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
            </div>
          )}
        </div>
      )}
      {def.type === "NUMBER" && (
        <div className="flex gap-2">
          <Input type="number" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} placeholder={t("Min")} aria-label={t("Min")} />
          <Input type="number" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} placeholder={t("Max")} aria-label={t("Max")} />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>{t("Cancel")}</Button>
        <Button size="sm" onClick={apply}>{t("Apply")}</Button>
      </div>
    </div>
  );
}
