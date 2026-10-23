"use client";

import {useT} from "@/i18n/client";

import { JOURNEY, JOURNEY_POS } from "@/lib/status";
import type { CaseStatus } from "@/lib/types";

interface Step {
  label: string;
  state: "done" | "here" | "paused" | "todo";
  glyph: string;
  /** Whether the line to the next step is filled in. */
  lineDone: boolean;
}

function stepsFor(status: CaseStatus): { steps: Step[]; headline: string; paused: boolean; cur: number } {
  const { cur, paused } = JOURNEY_POS[status];
  const completed = status === "COMPLETED";
  const steps = JOURNEY.map((label, i): Step => {
    const done = completed || i < cur;
    const here = i === cur && !done;
    let state: Step["state"] = "todo";
    if (done) state = "done";
    if (here) state = paused ? "paused" : "here";
    return {
      label,
      state,
      glyph: state === "done" ? "✓" : state === "paused" ? "II" : String(i + 1),
      lineDone: completed || i < cur,
    };
  });
  const headline = paused ? `Paused at ${JOURNEY[cur].toLowerCase()}` : JOURNEY[cur];
  return { steps, headline, paused, cur };
}

const CIRCLE: Record<Step["state"], string> = {
  done: "border-deep-aqua bg-deep-aqua text-deep",
  here: "border-deep-ink bg-deep-ink text-deep",
  paused: "border-[#E8B84A] bg-[#E8B84A] text-deep",
  todo: "border-deep-line bg-transparent text-deep-muted",
};

const LABEL: Record<Step["state"], string> = {
  done: "font-medium text-deep-ink",
  here: "font-semibold text-deep-ink",
  paused: "font-semibold text-deep-ink",
  todo: "text-deep-muted",
};

/** The dark progress panel: six steps, with a pause marker when the case is waiting on someone. */
export function JourneyPanel({
  status,
  eyebrow,
  pauseText,
  dates,
  large = false,
}: {
  status: CaseStatus;
  eyebrow: string;
  pauseText?: string;
  /** Optional date under each step (staff case page). */
  dates?: (string | undefined)[];
  large?: boolean;
}) {
  const translate = useT();
  const { steps, headline, paused } = stepsFor(status);
  return (
    <section aria-label={translate("Case progress")} className={`flex flex-col gap-6 rounded-xl bg-deep text-deep-ink ${large ? "px-5 py-6 md:px-8 md:py-7" : "px-5 py-5 md:px-7 md:py-6"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[.8px] text-deep-aqua">{translate(eyebrow)}</div>
          <div className={`mt-1.5 font-semibold ${large ? "text-2xl" : "text-xl"}`}>{paused ? translate("Paused at {stage}", {stage: translate(JOURNEY[JOURNEY_POS[status].cur])}) : translate(headline)}</div>
        </div>
        {paused && pauseText && (
          <div className="inline-flex items-center gap-2.5 rounded-lg border border-deep-line bg-deep-2 px-3.5 py-2.5 text-sm">
            <span className="h-2 w-2 rounded-full bg-[#E8B84A]" />
            {translate(pauseText)}
          </div>
        )}
      </div>

      {/* Wide: steps across */}
      <ol className="m-0 hidden list-none p-0 md:flex">
        {steps.map((s, i) => (
          <li key={s.label} className="flex min-w-0 flex-1 flex-col gap-2.5" aria-current={s.state === "here" || s.state === "paused" ? "step" : undefined}>
            <div className="flex items-center">
              <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 text-[13px] font-semibold ${CIRCLE[s.state]}`}>{s.glyph}</div>
              {i < steps.length - 1 && <div className="mx-2 h-0.5 flex-1" style={{ background: s.lineDone ? "var(--deep-aqua)" : "var(--deep-line)" }} />}
            </div>
            <div>
              <div className={`text-sm ${LABEL[s.state]}`}>{translate(s.label)}</div>
              {dates?.[i] && <div className="mt-0.5 text-[13px] text-deep-muted">{dates[i]}</div>}
            </div>
          </li>
        ))}
      </ol>

      {/* Narrow: steps down */}
      <ol className="m-0 flex list-none flex-col p-0 md:hidden">
        {steps.map((s, i) => (
          <li key={s.label} className="flex gap-3.5" aria-current={s.state === "here" || s.state === "paused" ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 text-[13px] font-semibold ${CIRCLE[s.state]}`}>{s.glyph}</div>
              {i < steps.length - 1 && <div className="h-6 w-0.5" style={{ background: s.lineDone ? "var(--deep-aqua)" : "var(--deep-line)" }} />}
            </div>
            <div className="pt-1">
              <div className={`text-[15px] ${LABEL[s.state]}`}>{translate(s.label)}</div>
              {dates?.[i] && <div className="text-[13px] text-deep-muted">{dates[i]}</div>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
