"use client";

import { useT } from "@/i18n/client";

export type StepState = "done" | "cur" | "locked";

export interface StepInfo {
  title: string;
  state: StepState;
  /** The step currently open on the page. */
  open: boolean;
  instruction: string;
  /** Pending the client's decision: shown with the amber tag. */
  pending?: boolean;
}

const MARK: Record<StepState, { ring: string; bg: string; fg: string; glyph: string; label: string; short: string }> = {
  cur: { ring: "#B3261E", bg: "#fff", fg: "#B3261E", glyph: "●", label: "To do", short: "To do" },
  done: { ring: "#1B7A3E", bg: "#1B7A3E", fg: "#fff", glyph: "✓", label: "Done", short: "Done" },
  locked: { ring: "#A9BBD0", bg: "#F3F7FC", fg: "#52657E", glyph: "", label: "Complete the step before first", short: "Locked" },
};

/**
 * The four steps of a case. Each step shows its state in words as well as colour: To do (red), Done (green), Locked (grey).
 * On a wide screen it is a card down the left side; on a phone it is a row of numbered steps with the open one explained below.
 */
export function StepCard({ steps, onOpen, phone }: { steps: StepInfo[]; onOpen: (index: number) => void; phone?: boolean }) {
  const t = useT();
  if (phone) {
    const open = steps.findIndex((s) => s.open);
    return (
      <div className="rounded-xl border border-line bg-surface p-3.5">
        <ol className="m-0 flex list-none items-center gap-1.5 p-0" aria-label={t("Case steps")}>
          {steps.map((s, i) => {
            const m = MARK[s.state];
            return (
              <li key={s.title} className="flex flex-1 items-center gap-1.5">
                <button
                  type="button"
                  disabled={s.state === "locked"}
                  onClick={() => onOpen(i)}
                  aria-current={s.open ? "step" : undefined}
                  aria-label={`${t("Step {n}", { n: i + 1 })}: ${t(s.title)}, ${t(m.short)}`}
                  className="flex h-11 min-w-11 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold disabled:cursor-not-allowed"
                  style={{ borderColor: s.open ? "#1D6FE8" : "transparent", background: s.open ? "#EEF4FD" : "transparent" }}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs" style={{ borderColor: m.ring, background: m.bg, color: m.fg }}>
                    {m.glyph || i + 1}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {open >= 0 && (
          <div className="mt-2 px-1">
            <div className="text-xs font-semibold uppercase tracking-[.8px] text-muted">{t("Step {n} of {total}", { n: open + 1, total: steps.length })}</div>
            <div className="text-[17px] font-semibold">{t(steps[open].title)}{steps[open].pending && <span className="ms-2 rounded bg-pending-bg px-2 py-0.5 align-middle text-xs font-normal text-pending-ink">{t("Pending client decision")}</span>}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <ol className="m-0 flex list-none flex-col gap-2 rounded-xl border border-line bg-surface p-3 md:p-4" aria-label={t("Case steps")}>
      {steps.map((s, i) => {
        const m = MARK[s.state];
        return (
          <li key={s.title}>
            <button
              type="button"
              disabled={s.state === "locked"}
              onClick={() => onOpen(i)}
              aria-current={s.open ? "step" : undefined}
              className="flex w-full items-start gap-3 rounded-lg border p-3 text-start disabled:cursor-not-allowed"
              style={{ borderColor: s.open ? "#1D6FE8" : "transparent", background: s.open ? "#EEF4FD" : "#fff" }}
            >
              <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 text-[13px] font-semibold" style={{ borderColor: m.ring, background: m.bg, color: m.fg }}>
                {m.glyph || i + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold">{i + 1}. {t(s.title)}{s.pending && <span className="ms-2 rounded bg-pending-bg px-1.5 py-0.5 align-middle text-[11px] font-normal text-pending-ink">{t("Pending client decision")}</span>}</span>
                <span className="text-[13px] font-medium" style={{ color: s.state === "locked" ? "#52657E" : m.ring }}>{t(s.state === "locked" ? m.label : m.short)}</span>
                {s.open && <span className="mt-1 text-[13px] text-muted">{t(s.instruction)}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
