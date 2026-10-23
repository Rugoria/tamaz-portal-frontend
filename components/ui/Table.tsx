"use client";

import {useT} from "@/i18n/client";

import type { ReactNode } from "react";

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
}

/** The design's grid table (TzTable): header row, rows, optional footer with paging. Scrolls sideways on small screens. */
export function DataTable<T>({
  columns,
  rows,
  grid,
  rowKey,
  rowBg,
  onRowClick,
  footer,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  minWidth = 760,
}: {
  columns: Column<T>[];
  rows: T[];
  grid: string;
  rowKey: (row: T) => string;
  rowBg?: (row: T) => string | undefined;
  /** Makes the whole row clickable. Keep a real link inside the row too, for keyboard users. */
  onRowClick?: (row: T) => void;
  footer?: string;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  minWidth?: number;
}) {
  const translate = useT();
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <div style={{ minWidth }}>
        <div
          className="grid gap-4 border-b border-line bg-bg px-5 py-3 text-xs font-semibold uppercase tracking-[.6px] text-muted"
          style={{ gridTemplateColumns: grid }}
        >
          {columns.map((c) => (
            <span key={c.header}>{translate(c.header)}</span>
          ))}
        </div>
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`grid items-center gap-4 border-b border-line px-5 py-3.5 text-sm ${onRowClick ? "cursor-pointer hover:bg-bg" : ""}`}
            style={{ gridTemplateColumns: grid, background: rowBg?.(row) }}
          >
            {columns.map((c) => (
              <div key={c.header} className="min-w-0">
                {c.render(row)}
              </div>
            ))}
          </div>
        ))}
        {footer !== undefined && (
          <div className="flex items-center justify-between px-5 py-3 text-sm text-muted">
            <span>{translate(footer)}</span>
            <div className="flex gap-2">
              <button
                onClick={onPrev}
                disabled={!hasPrev}
                className="h-9 rounded-lg border border-line bg-surface px-3.5 text-muted disabled:cursor-not-allowed enabled:text-ink"
              >
                {translate("Previous")}</button>
              <button
                onClick={onNext}
                disabled={!hasNext}
                className="h-9 rounded-lg border border-line bg-surface px-3.5 text-muted disabled:cursor-not-allowed enabled:text-ink"
              >
                {translate("Next")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <span className="text-muted">{children}</span>;
}
