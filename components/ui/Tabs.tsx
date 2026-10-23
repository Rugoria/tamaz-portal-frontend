"use client";
import {useT} from "@/i18n/client";

/** Underlined tab strip (state-driven). */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}) {
  const translate = useT();
  return (
    <div role="tablist" className="flex gap-6 overflow-x-auto border-b border-line">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={`min-h-11 whitespace-nowrap border-b-2 py-2.5 ${on ? "border-accent font-semibold text-accent" : "border-transparent font-medium text-muted hover:text-ink"}`}
          >
            {translate(t.label)}
          </button>
        );
      })}
    </div>
  );
}

/** Pill filter (single choice). */
export function FilterChips<T extends string>({
  options,
  active,
  onChange,
}: {
  options: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}) {
  const translate = useT();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((o) => {
        const on = o.key === active;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            aria-pressed={on}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium md:min-h-9 ${on ? "border-accent bg-accent-soft text-accent-deep" : "border-line bg-surface text-ink hover:bg-surface-2"}`}
          >
            {translate(o.label)}
          </button>
        );
      })}
    </div>
  );
}
