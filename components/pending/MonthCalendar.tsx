"use client";
import {useLocalizedFormats} from "@/i18n/formats";

import {useT} from "@/i18n/client";

import {addMonths, monthCells, sameDay} from "@/lib/dates";

/** Month grid used by the preview-only appointment screens. `marks` returns open/booked counts for a day. */
export function MonthCalendar({
  month,
  onMonth,
  selected,
  onSelect,
  hasOpen,
  minDate,
}: {
  month: Date;
  onMonth: (m: Date) => void;
  selected: Date | null;
  onSelect: (d: Date) => void;
  hasOpen: (d: Date) => boolean;
  minDate: Date;
}) {
  const {DOW, MONTH_NAMES} = useLocalizedFormats();
  const translate = useT();
  const cells = monthCells(month);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold">
          {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
        </span>
        <div className="flex gap-1.5">
          <button onClick={() => onMonth(addMonths(month, -1))} aria-label={translate("Previous month")} className="flex h-11 w-11 items-center justify-center rounded-lg border border-line">
            <span className="directional-icon inline-block" aria-hidden="true">‹</span>
          </button>
          <button onClick={() => onMonth(addMonths(month, 1))} aria-label={translate("Next month")} className="flex h-11 w-11 items-center justify-center rounded-lg border border-line">
            <span className="directional-icon inline-block" aria-hidden="true">›</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DOW.map((d) => (
          <div key={d} className="py-1 text-xs text-muted">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`b${i}`} />;
          const past = d < minDate && !sameDay(d, minDate);
          const open = !past && hasOpen(d);
          const on = !!selected && sameDay(d, selected);
          return (
            <button
              key={d.toISOString()}
              disabled={!open}
              onClick={() => onSelect(d)}
              aria-pressed={on}
              className={`flex h-[46px] flex-col items-center justify-center gap-[3px] rounded-lg border-[1.5px] text-sm disabled:cursor-default ${on ? "border-accent bg-accent-soft font-semibold text-accent-deep" : open ? "border-line bg-surface font-medium hover:bg-bg" : "border-transparent bg-transparent text-muted/60"}`}
            >
              {d.getDate()}
              <span className="h-[5px] w-[5px] rounded-full" style={{ background: open ? "var(--aqua)" : "transparent" }} />
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 text-[13px] text-muted">
        <span className="h-2 w-2 rounded-full bg-aqua" />
        {translate("Open times")}</div>
    </div>
  );
}
