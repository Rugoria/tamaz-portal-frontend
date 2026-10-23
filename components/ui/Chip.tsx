"use client";
import {useT} from "@/i18n/client";
import { CHIPS, TONES, type ChipKey, type Tone } from "@/lib/status";

/** A status or label chip (TzChip). Pass `status` for a known key, or `label` plus `tone`. */
export function Chip({ status, label, tone }: { status?: ChipKey; label?: string; tone?: Tone }) {
  const translate = useT();
  const known = status ? CHIPS[status] : undefined;
  const text = label ?? known?.[0] ?? "";
  const t = TONES[tone ?? known?.[1] ?? "neutral"];
  const pulse = status === "submitting" || status === "inprogress";
  return (
    <span
      className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[13px] font-medium"
      style={{ background: t.bg, color: t.fg, borderColor: t.bd }}
    >
      {pulse && <span className="tz-dot inline-block h-1.5 w-1.5 rounded-full bg-current" />}
      {translate(text)}
    </span>
  );
}

/** Small role pill used in lists and message headers. */
export function RolePill({ label }: { label: string }) {
  const translate = useT();
  return <span className="rounded-full bg-aqua-soft px-2 py-0.5 text-xs text-aqua-deep">{translate(label)}</span>;
}
