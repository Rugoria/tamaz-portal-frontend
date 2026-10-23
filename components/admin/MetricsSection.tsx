"use client";

import { useState } from "react";
import Link from "@/i18n/navigation";
import { useT } from "@/i18n/client";
import { useLocalizedFormats } from "@/i18n/formats";
import { useApi } from "@/lib/hooks";
import { CASE_CHIP, CHIPS, ROLE_LABEL } from "@/lib/status";
import type { AdminMetrics, CaseStatus } from "@/lib/types";
import { Chip, RolePill } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ErrorState, PendingTag } from "@/components/ui/states";

const RANGES = [7, 30, 90] as const;
const ORDER: CaseStatus[] = ["DRAFT", "READY_FOR_SUBMISSION", "SUBMISSION_QUEUED", "SUBMITTED_EXTERNAL", "DESIGN_REJECTED", "DESIGN_APPROVED", "PRODUCTION", "SHIPPED", "COMPLETED", "FAILED"];
const BAR: Record<CaseStatus, string> = {
  DRAFT: "#3A4A60", READY_FOR_SUBMISSION: "#1D6FE8", SUBMISSION_QUEUED: "#1D6FE8", SUBMITTED_EXTERNAL: "#1D6FE8", DESIGN_REJECTED: "#C98A00",
  DESIGN_APPROVED: "#43A8C4", PRODUCTION: "#1456B8", SHIPPED: "#43A8C4", COMPLETED: "#7FA3AE", FAILED: "#B3261E",
};

function pct(now: number, before: number) {
  if (before <= 0) return null;
  const d = Math.round((now / before - 1) * 100);
  return (d >= 0 ? "+" : "") + d + "%";
}

function niceStep(span: number) {
  const raw = span / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

function ChartCard({ title, sub, table, onToggle, children, tableView }: { title: string; sub?: string; table: boolean; onToggle: () => void; children: React.ReactNode; tableView: React.ReactNode }) {
  const translate = useT();
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="m-0 text-[17px] font-semibold">{translate(title)}</h3>
          {sub && <div className="mt-0.5 text-sm text-muted">{sub}</div>}
        </div>
        <button onClick={onToggle} className="inline-flex min-h-11 items-center px-3 font-medium text-accent-deep">
          {translate(table ? "View as chart" : "View as table")}
        </button>
      </div>
      {table ? tableView : children}
    </section>
  );
}

function SimpleTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  const translate = useT();
  return (
    <div className="max-h-[260px] overflow-auto rounded-lg border border-surface-2">
      <table className="w-full border-collapse text-start">
        <thead className="sticky top-0 bg-bg text-xs font-semibold uppercase tracking-[.6px] text-muted">
          <tr>{head.map((h) => <th key={h} className="px-4 py-2.5 text-start">{translate(h)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-surface-2">{r.map((c, j) => <td key={j} className={`px-4 py-2 ${j ? "font-medium" : ""}`}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LineChart({ values, labels, color, fill, label, tipText, zeroBased, W = 640, ticksX = 6 }: { values: number[]; labels: string[]; color: string; fill: string; label: string; tipText: (i: number) => string; zeroBased?: boolean; W?: number; ticksX?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const H = 230, L = 40, R = 14, T = 12, B = 28;
  const n = values.length;
  const max = Math.max(...values), min = zeroBased ? 0 : Math.min(...values);
  const step = niceStep(Math.max(1, max - min));
  const lo = zeroBased ? 0 : Math.floor(min / step) * step;
  const hi = Math.max(lo + step, Math.ceil(max / step) * step);
  const x = (i: number) => L + (n === 1 ? 0 : (i / (n - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks: number[] = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);
  const line = "M" + values.map((v, i) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" L");
  const areaPath = `${line} L${x(n - 1).toFixed(1)} ${y(lo)} L${x(0).toFixed(1)} ${y(lo)} Z`;
  const every = Math.max(1, Math.round(n / ticksX));
  return (
    <div dir="ltr" className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          setHover(Math.max(0, Math.min(n - 1, Math.round(((px - L) / (W - L - R)) * (n - 1)))));
        }}>
        {ticks.map((t) => (
          <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#E6EEF8" /><text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="#52657E">{t}</text></g>
        ))}
        <path d={areaPath} fill={fill} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
        {labels.map((l, i) => ((n - 1 - i) % every === 0 ? <text key={i} x={x(i)} y={H - 6} textAnchor={i === n - 1 ? "end" : i === 0 ? "start" : "middle"} fontSize="12" fill="#52657E">{l}</text> : null))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="#0B1F3A" strokeOpacity=".35" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(values[hover])} r="5" fill="#fff" stroke={color} strokeWidth="2.5" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute whitespace-nowrap rounded-lg bg-deep px-3 py-2 text-[13px] text-white shadow-lg"
          style={{ left: `${Math.min((x(hover) / W) * 100 + 2, 70)}%`, top: `${Math.max(2, (y(values[hover]) / H) * 100 - 30)}%` }}>
          {tipText(hover).split("\n").map((t, i) => <div key={i} className={i ? "text-[15px] font-semibold" : "text-[#B7C6DA]"}>{t}</div>)}
        </div>
      )}
    </div>
  );
}

export function MetricsSection() {
  const translate = useT();
  const { relative } = useLocalizedFormats();
  const [range, setRange] = useState<number>(30);
  const [tables, setTables] = useState<Record<string, boolean>>({});
  const m = useApi<AdminMetrics>(`/admin/metrics?range=${range}`, { keepPreviousData: true });
  const flip = (k: string) => setTables((t) => ({ ...t, [k]: !t[k] }));

  if (m.error) return <ErrorState title="We couldn't load the overview." onRetry={m.reload} />;
  const d = m.data;
  const loading = !d;
  const t = d?.tiles;
  const sparse = d ? !d.enoughData : false;
  const na = translate("Not enough data yet");
  const vs = (now: number, before: number, what: string) => {
    const p = pct(now, before);
    return p ? `${p} ${what}` : translate("No earlier data to compare");
  };
  const tile = (label: string, value: number | undefined, delta: string | null, attention?: boolean) => (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-line bg-surface p-5">
      <div className="text-sm text-muted">{translate(label)}</div>
      {loading ? <div className="tz-pulse h-[38px] w-[90px] rounded-md bg-surface-2" /> : <div className="text-[34px] font-semibold leading-[1.1]">{value}</div>}
      {!loading && <div className={`text-[13px] ${attention && (value ?? 0) > 0 && !sparse ? "text-red" : "text-muted"}`}>{sparse && !attention ? na : delta}</div>}
      {!loading && attention && (value ?? 0) > 0 && <a href="#attention" className="text-[13px] text-accent-deep">{translate("See needs attention")}</a>}
    </div>
  );

  const dates = d?.daily.map((x) => new Date(x.date + "T00:00:00")) ?? [];
  const short = (x: Date) => x.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const full = (x: Date) => x.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const counts = d?.daily.map((x) => x.count) ?? [];
  const running: number[] = [];
  if (d) {
    let r = d.growthStart;
    counts.forEach((c) => {
      r += c;
      running.push(r);
    });
  }
  const byStatus = ORDER.map((s) => ({ s, n: d?.byStatus.find((x) => x.status === s)?.count ?? 0 }));
  const grand = byStatus.reduce((a, b) => a + b.n, 0) || 1;
  const maxS = Math.max(1, ...byStatus.map((x) => x.n));
  const busyMax = Math.max(1, ...(d?.busiest.map((b) => b.count) ?? [1]));
  const lastN = translate("Last {n} days", { n: range });
  const skeleton = <div className="tz-pulse h-[230px] rounded-lg bg-surface-2" />;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="m-0 text-lg font-semibold">{translate("Metrics")}<PendingTag /></h2>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <div role="group" aria-label={translate("Date range")} className="flex overflow-hidden rounded-lg border border-line bg-surface">
            {RANGES.map((r, i) => (
              <button key={r} onClick={() => setRange(r)} aria-pressed={range === r}
                className={`h-11 px-4 ${i ? "border-s border-line" : ""} ${range === r ? "bg-accent-soft font-semibold text-accent-deep" : "font-medium text-muted"}`}>
                {translate("Last {n} days", { n: r })}
              </button>
            ))}
          </div>
          <span className="text-[13px] text-muted">{translate("Days shown in your time zone")}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{d ? translate("Updated {when}", { when: relative(d.generatedAt) }) : ""}</span>
          <Button variant="secondary" onClick={m.reload}>{translate("Refresh")}</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tile("Total cases", t?.totalCases, t ? vs(t.totalCases, t.totalCasesBefore, translate("vs {n} days ago", { n: range })) : null)}
        {tile("New cases today", t?.newToday, t ? vs(t.newToday, t.newYesterday, translate("vs yesterday")) : null)}
        {tile("New cases this week", t?.newThisWeek, t ? vs(t.newThisWeek, t.newPreviousWeek, translate("vs last week")) : null)}
        {tile("Failed deliveries", t?.failedDeliveries, t && t.failedDeliveries > 0 ? translate("{v0} failed deliveries", { v0: t.failedDeliveries }) : translate("No failed deliveries."), true)}
      </div>

      {sparse && (
        <div className="rounded-xl border border-line bg-surface px-6 py-14 text-center">
          <div className="text-lg font-semibold">{translate("Not enough data yet.")}</div>
          <div className="mx-auto mt-1.5 max-w-md text-muted">{translate("Charts appear once cases have been created on at least 3 different days.")}</div>
        </div>
      )}

      {!sparse && (
        <>
          <div className="grid items-start gap-6 xl:grid-cols-[2fr_1fr]">
            <ChartCard title="Cases per day" sub={d ? `${translate("{n} new cases", { n: counts.reduce((a, b) => a + b, 0) })} · ${lastN}` : undefined} table={!!tables.daily} onToggle={() => flip("daily")}
              tableView={<SimpleTable head={["Date", "New cases"]} rows={dates.map((x, i) => [full(x), counts[i]]).reverse()} />}>
              {loading ? skeleton : (
                <LineChart values={counts} labels={dates.map(short)} color="#1D6FE8" fill="#E3EDFC" zeroBased label={translate("Cases per day")}
                  tipText={(i) => `${full(dates[i])}\n${translate("{n} new cases", { n: counts[i] })}`} />
              )}
            </ChartCard>
            <ChartCard title="Growth" sub={d ? `${d.growthStart} → ${d.growthEnd} · ${lastN}` : undefined} table={!!tables.growth} onToggle={() => flip("growth")}
              tableView={<SimpleTable head={["Date", "Total cases"]} rows={dates.map((x, i) => [full(x), running[i]]).reverse()} />}>
              {loading ? skeleton : (
                <>
                  <LineChart values={running} labels={dates.map(short)} color="#0E8FB3" fill="#D6F0F7" W={320} ticksX={2} label={translate("Growth")}
                    tipText={(i) => `${full(dates[i])}\n${translate("{n} cases in total", { n: running[i] })}`} />
                  <div className="flex justify-between text-sm font-semibold"><span>{d.growthStart}</span><span>{d.growthEnd}</span></div>
                </>
              )}
            </ChartCard>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <ChartCard title="Cases by status" sub={translate("All cases right now")} table={!!tables.status} onToggle={() => flip("status")}
              tableView={<SimpleTable head={["Status", "Cases", "Share"]} rows={byStatus.map((x) => [translate(CHIPS[CASE_CHIP[x.s]][0]), x.n, ((x.n / grand) * 100).toFixed(1) + "%"])} />}>
              {loading ? <div className="tz-pulse h-[360px] rounded-lg bg-surface-2" /> : (
                <div className="flex flex-col">
                  {byStatus.map((x) => (
                    <div key={x.s} className="grid min-h-9 grid-cols-[150px_1fr_40px_52px] items-center gap-3">
                      <span><Chip status={CASE_CHIP[x.s]} /></span>
                      <div className="h-2.5 rounded-full bg-surface-2"><div className="h-2.5 rounded-full" style={{ width: `${(x.n / maxS) * 100}%`, background: BAR[x.s] }} /></div>
                      <span className="text-end font-semibold">{x.n}</span>
                      <span className="text-end text-[13px] text-muted">{((x.n / grand) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>
            <ChartCard title="Busiest clinics and doctors" sub={lastN} table={!!tables.busy} onToggle={() => flip("busy")}
              tableView={<SimpleTable head={["Sender", "Type", "Cases"]} rows={(d?.busiest ?? []).map((b) => [b.name, translate(ROLE_LABEL[b.role]), b.count])} />}>
              {loading ? skeleton : (
                <div className="flex flex-col">
                  {d.busiest.length === 0 && <div className="py-6 text-center text-muted">{translate("No cases in this range.")}</div>}
                  {d.busiest.map((b) => (
                    <div key={b.id} className="flex min-h-14 items-center gap-3 border-b border-surface-2">
                      <div className="flex min-w-0 flex-1 flex-col items-start gap-1"><span className="font-medium">{b.name}</span><RolePill label={translate(ROLE_LABEL[b.role])} /></div>
                      <div className="h-2 w-[120px] rounded bg-surface-2"><div className="h-2 rounded bg-accent" style={{ width: `${(b.count / busyMax) * 100}%` }} /></div>
                      <span className="w-9 text-end font-semibold">{b.count}</span>
                    </div>
                  ))}
                  <Link href="/admin/cases" className="flex min-h-11 items-center font-medium text-accent-deep no-underline">{translate("View all")}</Link>
                </div>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
